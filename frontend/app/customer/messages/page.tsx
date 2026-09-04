"use client";

import { Suspense } from "react";
import MessagesWorkspace from "@/components/messages/MessagesWorkspace";

export default function CustomerMessagesPage() {
  return (
    <Suspense
      fallback={
        <p className="eyebrow text-ink-muted">Loading messages…</p>
      }
    >
      <MessagesWorkspace role="customer" />
    </Suspense>
  );
}
