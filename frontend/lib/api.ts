import type {
  AppNotification,
  ConversationMessage,
  ConversationSummary,
  CustomerPropertyRequest,
  OwnerPropertyRequest,
  Property,
  PropertyRequestProperty,
  RequestStatus,
} from "./types";
import { mediaUrl } from "./format";
import { API_BASE } from "./config";
import { apiFetch } from "./auth";

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function normalizeProperty(property: Property): Property {
  return {
    ...property,
    images: property.images.map((image) => ({
      ...image,
      url: mediaUrl(image.url),
    })),
  };
}

export async function getProperties(): Promise<Property[]> {
  const data = await fetchJson<Property[]>("/api/properties/");
  if (!data) return [];
  return data.map(normalizeProperty);
}

export async function getProperty(id: number): Promise<Property | null> {
  const data = await fetchJson<Property>(`/api/properties/${id}/`);
  if (!data) return null;
  return normalizeProperty(data);
}

export async function getFeaturedProperties(limit = 4): Promise<Property[]> {
  const properties = await getProperties();
  return properties.slice(0, limit);
}

/** Client-safe public property list (no Next.js cache options). */
export async function fetchMarketplaceProperties(): Promise<{
  properties: Property[];
  error: string | null;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/properties/`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) {
      return { properties: [], error: "Could not load properties." };
    }
    const data = (await response.json()) as Property[];
    return { properties: data.map(normalizeProperty), error: null };
  } catch {
    return { properties: [], error: "Unable to reach the server." };
  }
}

/**
 * Authenticated owner's properties only.
 * Requires an owner session cookie; returns [] on unauthorized/error.
 */
export async function getOwnerProperties(): Promise<{
  properties: Property[];
  error: string | null;
  status: number | null;
}> {
  try {
    const response = await apiFetch("/api/properties/mine/");
    if (response.status === 401 || response.status === 403) {
      return {
        properties: [],
        error: "Owner access required.",
        status: response.status,
      };
    }
    if (!response.ok) {
      return {
        properties: [],
        error: "Could not load your properties.",
        status: response.status,
      };
    }
    const data = (await response.json()) as Property[];
    return {
      properties: data.map(normalizeProperty),
      error: null,
      status: response.status,
    };
  } catch {
    return {
      properties: [],
      error: "Unable to reach the server.",
      status: null,
    };
  }
}

export type CreatePropertyInput = {
  title: string;
  description: string;
  property_type: string;
  location: string;
  price: string;
  status: string;
  images: File[];
};

export type CreatePropertyResult =
  | { ok: true; property: Property }
  | { ok: false; errors: Record<string, string>; status: number | null };

function flattenErrors(payload: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!payload || typeof payload !== "object") {
    errors.form = "Could not publish this property.";
    return errors;
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.detail === "string") {
    errors.form = data.detail;
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === "detail") continue;
    if (typeof value === "string") {
      errors[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      errors[key] = String(value[0]);
    } else if (value && typeof value === "object") {
      // nested — skip
    }
  }

  if (Object.keys(errors).length === 0) {
    errors.form = "Could not publish this property.";
  }
  return errors;
}

export async function createOwnerProperty(
  input: CreatePropertyInput,
): Promise<CreatePropertyResult> {
  try {
    const formData = new FormData();
    formData.append("title", input.title);
    formData.append("description", input.description);
    formData.append("property_type", input.property_type);
    formData.append("location", input.location);
    formData.append("price", input.price);
    formData.append("status", input.status);
    for (const file of input.images) {
      formData.append("images", file);
    }

    const response = await apiFetch("/api/properties/mine/", {
      method: "POST",
      body: formData,
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        errors: flattenErrors(payload),
        status: response.status,
      };
    }

    return {
      ok: true,
      property: normalizeProperty(payload as Property),
    };
  } catch {
    return {
      ok: false,
      errors: {
        form: "Unable to reach the server. Check that Django is running.",
      },
      status: null,
    };
  }
}

function normalizeRequestProperty(
  property: PropertyRequestProperty,
): PropertyRequestProperty {
  return {
    ...property,
    images: (property.images || []).map((image) => ({
      ...image,
      url: mediaUrl(image.url),
    })),
  };
}

function normalizeCustomerRequest(
  request: CustomerPropertyRequest,
): CustomerPropertyRequest {
  return {
    ...request,
    property: normalizeRequestProperty(request.property),
  };
}

function normalizeOwnerRequest(
  request: OwnerPropertyRequest,
): OwnerPropertyRequest {
  return {
    ...request,
    property: normalizeRequestProperty(request.property),
  };
}

export type CreatePropertyRequestResult =
  | {
      ok: true;
      request: CustomerPropertyRequest;
      alreadyExists: boolean;
    }
  | { ok: false; error: string; status: number | null };

export async function createPropertyRequest(
  propertyId: number,
): Promise<CreatePropertyRequestResult> {
  try {
    const response = await apiFetch("/api/requests/", {
      method: "POST",
      body: JSON.stringify({ property_id: propertyId }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: "Please log in as a customer to request a property.",
        status: response.status,
      };
    }

    if (!response.ok) {
      const data = (payload || {}) as {
        detail?: string;
        property_id?: string[];
      };
      const fieldError = Array.isArray(data.property_id)
        ? data.property_id[0]
        : null;
      return {
        ok: false,
        error:
          fieldError ||
          data.detail ||
          "Could not send this request. Please try again.",
        status: response.status,
      };
    }

    const request = normalizeCustomerRequest(
      payload as CustomerPropertyRequest,
    );
    return {
      ok: true,
      request,
      alreadyExists: Boolean(request.already_exists),
    };
  } catch {
    return {
      ok: false,
      error: "Unable to reach the server. Check that Django is running.",
      status: null,
    };
  }
}

export async function getCustomerRequests(): Promise<{
  requests: CustomerPropertyRequest[];
  error: string | null;
}> {
  try {
    const response = await apiFetch("/api/requests/mine/");
    if (!response.ok) {
      return { requests: [], error: "Could not load your requests." };
    }
    const data = (await response.json()) as CustomerPropertyRequest[];
    return {
      requests: data.map(normalizeCustomerRequest),
      error: null,
    };
  } catch {
    return { requests: [], error: "Unable to reach the server." };
  }
}

export async function getOwnerRequests(): Promise<{
  requests: OwnerPropertyRequest[];
  error: string | null;
}> {
  try {
    const response = await apiFetch("/api/requests/received/");
    if (!response.ok) {
      return { requests: [], error: "Could not load incoming requests." };
    }
    const data = (await response.json()) as OwnerPropertyRequest[];
    return {
      requests: data.map(normalizeOwnerRequest),
      error: null,
    };
  } catch {
    return { requests: [], error: "Unable to reach the server." };
  }
}

export async function updateRequestStatus(
  requestId: number,
  nextStatus: Extract<RequestStatus, "accepted" | "declined">,
): Promise<
  | { ok: true; request: OwnerPropertyRequest }
  | { ok: false; error: string }
> {
  try {
    const response = await apiFetch(`/api/requests/${requestId}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const data = (payload || {}) as { detail?: string; status?: string[] };
      return {
        ok: false,
        error:
          (Array.isArray(data.status) && data.status[0]) ||
          data.detail ||
          "Could not update this request.",
      };
    }
    return {
      ok: true,
      request: normalizeOwnerRequest(payload as OwnerPropertyRequest),
    };
  } catch {
    return { ok: false, error: "Unable to reach the server." };
  }
}

export async function getNotifications(): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
  error: string | null;
}> {
  try {
    const response = await apiFetch("/api/notifications/");
    if (!response.ok) {
      return {
        notifications: [],
        unreadCount: 0,
        error: "Could not load notifications.",
      };
    }
    const data = (await response.json()) as {
      notifications: AppNotification[];
      unread_count: number;
    };
    return {
      notifications: data.notifications || [],
      unreadCount: data.unread_count || 0,
      error: null,
    };
  } catch {
    return {
      notifications: [],
      unreadCount: 0,
      error: "Unable to reach the server.",
    };
  }
}

export async function markNotificationsRead(options: {
  ids?: number[];
  all?: boolean;
}): Promise<{ ok: boolean; unreadCount: number }> {
  try {
    const response = await apiFetch("/api/notifications/mark-read/", {
      method: "POST",
      body: JSON.stringify({
        ids: options.ids || [],
        all: Boolean(options.all),
      }),
    });
    if (!response.ok) {
      return { ok: false, unreadCount: 0 };
    }
    const data = (await response.json()) as { unread_count?: number };
    return { ok: true, unreadCount: data.unread_count || 0 };
  } catch {
    return { ok: false, unreadCount: 0 };
  }
}

export async function getConversations(): Promise<{
  conversations: ConversationSummary[];
  error: string | null;
}> {
  try {
    const response = await apiFetch("/api/messages/conversations/");
    if (!response.ok) {
      return { conversations: [], error: "Could not load conversations." };
    }
    const data = (await response.json()) as ConversationSummary[];
    return { conversations: data, error: null };
  } catch {
    return { conversations: [], error: "Unable to reach the server." };
  }
}

export async function getConversation(
  id: number,
): Promise<
  | { ok: true; conversation: ConversationSummary }
  | { ok: false; error: string; status: number | null }
> {
  try {
    const response = await apiFetch(`/api/messages/conversations/${id}/`);
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const data = (payload || {}) as { detail?: string };
      return {
        ok: false,
        error: data.detail || "Could not load this conversation.",
        status: response.status,
      };
    }
    return { ok: true, conversation: payload as ConversationSummary };
  } catch {
    return {
      ok: false,
      error: "Unable to reach the server.",
      status: null,
    };
  }
}

export async function openConversation(
  propertyRequestId: number,
): Promise<
  | { ok: true; conversation: ConversationSummary; created: boolean }
  | { ok: false; error: string; status: number | null }
> {
  try {
    const response = await apiFetch("/api/messages/conversations/", {
      method: "POST",
      body: JSON.stringify({ property_request_id: propertyRequestId }),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const data = (payload || {}) as {
        detail?: string;
        property_request_id?: string[] | string;
      };
      const field = data.property_request_id;
      const fieldError = Array.isArray(field) ? field[0] : field;
      return {
        ok: false,
        error:
          fieldError ||
          data.detail ||
          "Could not open this conversation.",
        status: response.status,
      };
    }
    const conversation = payload as ConversationSummary;
    return {
      ok: true,
      conversation,
      created: Boolean(conversation.created),
    };
  } catch {
    return {
      ok: false,
      error: "Unable to reach the server.",
      status: null,
    };
  }
}

export async function sendMessage(
  conversationId: number,
  body: string,
): Promise<
  | { ok: true; message: ConversationMessage }
  | { ok: false; error: string }
> {
  try {
    const response = await apiFetch(
      `/api/messages/conversations/${conversationId}/messages/`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      },
    );
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const data = (payload || {}) as { detail?: string; body?: string[] };
      return {
        ok: false,
        error:
          (Array.isArray(data.body) && data.body[0]) ||
          data.detail ||
          "Could not send message.",
      };
    }
    return { ok: true, message: payload as ConversationMessage };
  } catch {
    return { ok: false, error: "Unable to reach the server." };
  }
}

export async function markConversationRead(
  conversationId: number,
): Promise<{ ok: boolean; unreadCount: number }> {
  try {
    const response = await apiFetch(
      `/api/messages/conversations/${conversationId}/read/`,
      { method: "POST" },
    );
    if (!response.ok) return { ok: false, unreadCount: 0 };
    const data = (await response.json()) as { unread_count?: number };
    return { ok: true, unreadCount: data.unread_count || 0 };
  } catch {
    return { ok: false, unreadCount: 0 };
  }
}

