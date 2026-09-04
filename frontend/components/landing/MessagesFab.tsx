"use client";

import Link from "next/link";
import type { AuthUser } from "@/lib/auth-types";

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

  return (
    <Link
      href={href}
      className="messages-fab"
      aria-label={user ? "Open messages" : "Log in to open messages"}
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
    </Link>
  );
}
