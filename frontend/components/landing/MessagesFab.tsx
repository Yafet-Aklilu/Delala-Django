"use client";

import Link from "next/link";
import type { AuthUser } from "@/lib/auth-types";
import UnreadMessageBadge from "@/components/messages/UnreadMessageBadge";
import { useUnreadMessageCount } from "@/lib/useUnreadMessageCount";

type Props = {
  user?: AuthUser | null;
};

function messagesHref(user: AuthUser | null | undefined): string {
  if (user?.user_type === "owner") return "/owner/messages";
  if (user?.user_type === "customer") return "/customer/messages";
  return "/login";
}

export default function MessagesFab({ user = null }: Props) {
  const href = messagesHref(user);
  const canFetchUnread =
    user?.user_type === "owner" || user?.user_type === "customer";
  const messageUnreadCount = useUnreadMessageCount(Boolean(canFetchUnread));

  return (
    <Link
      href={href}
      className="messages-fab"
      aria-label={
        user
          ? messageUnreadCount > 0
            ? `Open messages, ${messageUnreadCount} unread`
            : "Open messages"
          : "Log in to open messages"
      }
      title="Messages"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4.5 6.75h15a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H9.75L5.25 20.25v-3H4.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z" />
      </svg>
      <UnreadMessageBadge
        count={messageUnreadCount}
        className="messages-nav-badge--fab"
      />
    </Link>
  );
}
