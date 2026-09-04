"use client";

import { Suspense } from "react";
import MessagesWorkspace from "@/components/messages/MessagesWorkspace";

export default function OwnerMessagesPage() {
  return (
    <Suspense
      fallback={
        <p className="eyebrow text-ink-muted">Loading messages…</p>
      }
    >
      <MessagesWorkspace role="owner" />
    </Suspense>
  );
}
