import type {
  AuthErrors,
  AuthFailure,
  AuthSuccess,
  AuthUser,
  CompleteFirebaseProfilePayload,
  GoogleAuthResult,
  ProfileCompletionNeeded,
  UserType,
} from "./auth-types";
import { API_BASE } from "./config";
import { getFirebaseAuth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, type AuthError } from "firebase/auth";

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

function isFirebaseAuthError(error: unknown): error is AuthError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

function logGoogleAuthDebug(info: {
  stage: string;
  status?: number;
  code?: string;
  detail?: string;
}): void {
  if (process.env.NODE_ENV === "production") return;
  // Dev-only: never log tokens, cookies, or credentials.
  console.warn("[delala:google-auth]", {
    stage: info.stage,
    status: info.status ?? null,
    code: info.code ?? null,
    detail: info.detail ?? null,
  });
}

async function parseFirebaseExchangeResponse(
  response: Response,
): Promise<GoogleAuthResult> {
  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    logGoogleAuthDebug({
      stage: "django_response_parse",
      status: response.status,
      detail: "non_json_body",
    });
    return {
      errors: { form: "Something went wrong. Please try again." },
    };
  }

  if (!response.ok) {
    const code = typeof data.code === "string" ? data.code : "";
    const detail =
      (typeof data.detail === "string" && data.detail) ||
      "Google sign-in could not be completed.";

    logGoogleAuthDebug({
      stage: "django_exchange",
      status: response.status,
      code: code || undefined,
      detail,
    });

    if (code === "profile_completion_required") {
      const email = typeof data.email === "string" ? data.email : "";
      const firebaseUid =
        typeof data.firebase_uid === "string" ? data.firebase_uid : "";
      const fieldErrors =
        data.errors && typeof data.errors === "object"
          ? (data.errors as AuthErrors)
          : undefined;
      return {
        needsProfileCompletion: true,
        email,
        firebase_uid: firebaseUid,
        ...(fieldErrors ? { errors: fieldErrors } : {}),
      };
    }

    if (code === "email_unverified") {
      return {
        errors: {
          form: "Verify your Google email before signing in to Delala.",
        },
      };
    }

    if (
      code === "firebase_not_configured" ||
      code === "firebase_unavailable" ||
      code === "firebase_init_failed"
    ) {
      return {
        errors: {
          form:
            "Google sign-in is not configured on the server yet. Set FIREBASE_CREDENTIALS_FILE for Django, then try again.",
        },
      };
    }

    if (data.errors && typeof data.errors === "object") {
      return { errors: data.errors as AuthErrors };
    }

    return {
      errors: {
        form: code ? `${detail} (${code})` : detail,
      },
    };
  }

  if (!data.user || typeof data.user !== "object") {
    logGoogleAuthDebug({
      stage: "django_exchange",
      status: response.status,
      detail: "missing_user_payload",
    });
    return {
      errors: { form: "Google sign-in could not be completed." },
    };
  }

  return {
    user: data.user as AuthUser,
    redirect:
      (typeof data.redirect === "string" && data.redirect) ||
      dashboardPathFor((data.user as AuthUser).user_type),
  };
}

/**
 * Google Sign-In via Firebase popup → Django session exchange.
 * Does not replace email/password login.
 */
export async function loginWithGoogle(): Promise<GoogleAuthResult> {
  let stage =
    "init" as
      | "init"
      | "popup"
      | "id_token"
      | "csrf_or_request"
      | "django_exchange"
      | "auth_state";

  try {
    stage = "init";
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    stage = "popup";
    const credential = await signInWithPopup(auth, provider);

    stage = "id_token";
    const idToken = await credential.user.getIdToken();

    stage = "csrf_or_request";
    const response = await authFetch("/api/auth/firebase/", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });

    stage = "django_exchange";
    const result = await parseFirebaseExchangeResponse(response);

    if (isAuthSuccess(result)) {
      stage = "auth_state";
      csrfTokenCache = null;
      emitAuthChange(result.user);
    }
    return result;
  } catch (error) {
    if (isFirebaseAuthError(error)) {
      logGoogleAuthDebug({
        stage,
        code: error.code,
        detail: error.message,
      });

      if (
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request"
      ) {
        return { errors: { form: "Google sign-in was cancelled." } };
      }
      if (error.code === "auth/popup-blocked") {
        return {
          errors: {
            form: "Pop-up was blocked. Allow pop-ups for this site and try again.",
          },
        };
      }
      if (error.code === "auth/network-request-failed") {
        return {
          errors: {
            form: "Network error during Google sign-in. Check your connection.",
          },
        };
      }
      if (error.code === "auth/unauthorized-domain") {
        return {
          errors: {
            form: "This domain is not authorized for Google sign-in in Firebase.",
          },
        };
      }
      if (error.code === "auth/operation-not-allowed") {
        return {
          errors: {
            form: "Google sign-in is not enabled in the Firebase console.",
          },
        };
      }

      return {
        errors: {
          form: `Google sign-in failed (${error.code}).`,
        },
      };
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    logGoogleAuthDebug({
      stage,
      detail: message,
    });

    if (/Firebase client config/i.test(message)) {
      return {
        errors: {
          form: "Google sign-in is not configured. Check Firebase environment variables.",
        },
      };
    }

    if (/secure session/i.test(message)) {
      return {
        errors: {
          form: "Could not start a secure session with the server (CSRF). Is Django running?",
        },
      };
    }

    return {
      errors: {
        form: `Unable to complete Google sign-in (${stage}). ${message}`,
      },
    };
  }
}

/**
 * Finish Delala Profile after Google/Firebase identity was verified.
 * Uses the current Firebase client session to obtain a fresh ID token.
 */
export async function completeFirebaseProfile(
  payload: CompleteFirebaseProfilePayload,
): Promise<AuthSuccess | AuthFailure> {
  try {
    const auth = getFirebaseAuth();
    const current = auth.currentUser;
    if (!current) {
      return {
        errors: {
          form: "Google session expired. Continue with Google again.",
        },
      };
    }

    const idToken = await current.getIdToken();
    const displayName = (current.displayName || "").trim();
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const firstName =
      payload.first_name || nameParts[0] || current.email?.split("@")[0] || "User";
    const lastName = payload.last_name || nameParts.slice(1).join(" ") || "";

    const response = await authFetch("/api/auth/firebase/", {
      method: "POST",
      body: JSON.stringify({
        id_token: idToken,
        user_type: payload.user_type,
        username: payload.username,
        phone_no: payload.phone_no,
        first_name: firstName,
        last_name: lastName,
      }),
    });

    const result = await parseFirebaseExchangeResponse(response);
    if (isProfileCompletionNeeded(result)) {
      return {
        errors: {
          form: "Could not complete your Delala profile. Check the fields and try again.",
          ...(result.errors || {}),
        },
      };
    }
    if (isAuthSuccess(result)) {
      csrfTokenCache = null;
      emitAuthChange(result.user);
      return result;
    }
    return result;
  } catch {
    return {
      errors: {
        form: "Unable to complete your profile. Please try again.",
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
  result: AuthSuccess | AuthFailure | GoogleAuthResult,
): result is AuthSuccess {
  return (
    typeof result === "object" &&
    result !== null &&
    "user" in result &&
    Boolean((result as AuthSuccess).user) &&
    !("needsProfileCompletion" in result)
  );
}

export function isProfileCompletionNeeded(
  result: GoogleAuthResult | AuthSuccess | AuthFailure,
): result is ProfileCompletionNeeded {
  return (
    typeof result === "object" &&
    result !== null &&
    "needsProfileCompletion" in result &&
    (result as ProfileCompletionNeeded).needsProfileCompletion === true
  );
}

export function dashboardPathFor(userType: UserType | null | undefined): string {
  if (userType === "owner") return "/owner";
  if (userType === "customer") return "/customer";
  return "/";
}
