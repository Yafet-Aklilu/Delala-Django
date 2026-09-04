import { openConversation } from "@/lib/api";

export async function startConversationFromRequest(
  propertyRequestId: number,
  role: "customer" | "owner",
): Promise<{ ok: true; href: string } | { ok: false; error: string }> {
  const result = await openConversation(propertyRequestId);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const base = role === "customer" ? "/customer/messages" : "/owner/messages";
  return { ok: true, href: `${base}?c=${result.conversation.id}` };
}
