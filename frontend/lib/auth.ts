import type {
  AuthFailure,
  AuthSuccess,
  AuthUser,
  UserType,
} from "./auth-types";
import { API_BASE } from "./config";

const AUTH_CHANGE_EVENT = "delala:auth-change";

export type AuthChangeDetail = { user: AuthUser | null };

/** Broadcast client auth state so UI updates immediately (no manual refresh). */
export function emitAuthChange(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AuthChangeDetail>(AUTH_CHANGE_EVENT, {
      detail: { user },
    }),
  );
}

export function subscribeAuthChange(
  listener: (user: AuthUser | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<AuthChangeDetail>).detail;
    listener(detail?.user ?? null);
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, handler);
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function readCsrfCookie(): string | null {
  return getCookie("delala_csrftoken") || getCookie("csrftoken");
}

let csrfTokenCache: string | null = null;

/**
 * Prefer the live CSRF cookie over any in-memory cache.
 * Django login/signup rotates the CSRF cookie; a stale cached header token
 * then fails with "CSRF token from the 'X-Csrftoken' HTTP header incorrect."
 */
export async function ensureCsrfToken(
  forceRefresh = false,
): Promise<string> {
  if (!forceRefresh) {
    const fromCookie = readCsrfCookie();
    if (fromCookie) {
      csrfTokenCache = fromCookie;
      return fromCookie;
    }
    if (csrfTokenCache) return csrfTokenCache;
  } else {
    csrfTokenCache = null;
  }

  const response = await fetch(`${API_BASE}/api/auth/csrf/`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Could not initialize a secure session.");
  }

  const data = (await response.json()) as { csrfToken?: string };
  // Cookie is Django's source of truth for header comparison.
  csrfTokenCache =
    readCsrfCookie() || data.csrfToken || null;

  if (!csrfTokenCache) {
    throw new Error("Could not initialize a secure session.");
  }

  return csrfTokenCache;
}

function isCsrfFailure(response: Response, detail: string): boolean {
  return (
    response.status === 403 &&
    /csrf/i.test(detail)
  );
}

async function authFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const method = (init.method || "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";

  if (mutating) {
    const csrf = await ensureCsrfToken();
    headers.set("X-CSRFToken", csrf);
    const isFormData =
      typeof FormData !== "undefined" && init.body instanceof FormData;
    if (!headers.has("Content-Type") && init.body && !isFormData) {
      headers.set("Content-Type", "application/json");
    }
  }

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });

  let response = await doFetch();

  // One retry after login/cookie rotation left a mismatched header token.
  if (mutating && response.status === 403) {
    let detail = "";
    try {
      const payload = (await response.clone().json()) as { detail?: string };
      detail = payload.detail || "";
    } catch {
      detail = "";
    }
    if (isCsrfFailure(response, detail)) {
      const csrf = await ensureCsrfToken(true);
      headers.set("X-CSRFToken", csrf);
      response = await doFetch();
    }
  }

  return response;
}

/** Authenticated fetch helper for owner/customer app API calls. */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return authFetch(path, init);
}

async function parseAuthResponse(
  response: Response,
): Promise<AuthSuccess | AuthFailure> {
  let data: AuthSuccess | AuthFailure | { detail?: string } = { errors: {} };

  try {
    data = await response.json();
  } catch {
    return {
      errors: {
        form: "Something went wrong. Please try again.",
      },
    };
  }

  if (!response.ok) {
    if ("errors" in data && data.errors) {
      return { errors: data.errors };
    }
    return {
      errors: {
        form:
          ("detail" in data && data.detail) ||
          "Request failed. Please try again.",
      },
    };
  }

  return data as AuthSuccess;
}

export type LoginPayload = {
  email: string;
  password: string;
  user_type: UserType;
};

export type SignupPayload = {
  user_type: UserType;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone_no: string;
  password: string;
  confirm_password: string;
};

export async function login(
  payload: LoginPayload,
): Promise<AuthSuccess | AuthFailure> {
  try {
    const response = await authFetch("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const result = await parseAuthResponse(response);
    if (isAuthSuccess(result)) {
      // Django rotates the CSRF cookie on login; drop any pre-login token.
      csrfTokenCache = null;
      emitAuthChange(result.user);
    }
    return result;
  } catch {
    return {
      errors: {
        form: "Unable to reach the server. Check that Django is running.",
      },
    };
  }
}

export async function signup(
  payload: SignupPayload,
): Promise<AuthSuccess | AuthFailure> {
  try {
    const response = await authFetch("/api/auth/signup/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const result = await parseAuthResponse(response);
    if (isAuthSuccess(result)) {
      csrfTokenCache = null;
      emitAuthChange(result.user);
    }
    return result;
  } catch {
    return {
      errors: {
        form: "Unable to reach the server. Check that Django is running.",
      },
    };
  }
}

export async function logout(): Promise<void> {
  try {
    csrfTokenCache = null;
    await authFetch("/api/auth/logout/", { method: "POST" });
  } finally {
    csrfTokenCache = null;
    // Clear client auth immediately so home/nav don't wait on a remount/refresh.
    emitAuthChange(null);
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await authFetch("/api/auth/me/");
    if (!response.ok) return null;
    const data = (await response.json()) as { user: AuthUser };
    return data.user;
  } catch {
    return null;
  }
}

export function isAuthSuccess(
  result: AuthSuccess | AuthFailure,
): result is AuthSuccess {
  return "user" in result && Boolean((result as AuthSuccess).user);
}

export function dashboardPathFor(userType: UserType | null | undefined): string {
  if (userType === "owner") return "/owner";
  if (userType === "customer") return "/customer";
  return "/";
}
