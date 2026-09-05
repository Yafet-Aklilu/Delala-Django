"use client";

import { useEffect, useState } from "react";
import { getConversations } from "@/lib/api";

const POLL_MS = 8000;

/** Sum unread counts from existing conversation list API. */
export async function fetchUnreadMessageTotal(): Promise<number> {
  const result = await getConversations();
  if (result.error) return 0;
  return result.conversations.reduce(
    (sum, item) => sum + (item.unread_count || 0),
    0,
  );
}

/**
 * Lightweight unread total for nav badges.
 * Polls the existing conversations endpoint; disabled when `enabled` is false.
 */
export function useUnreadMessageCount(enabled: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let cancelled = false;
    let timer: number | null = null;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || document.hidden || inFlight) return;
      inFlight = true;
      try {
        const total = await fetchUnreadMessageTotal();
        if (!cancelled) setCount(total);
      } finally {
        inFlight = false;
      }
    };

    const start = () => {
      if (timer != null) window.clearInterval(timer);
      timer = window.setInterval(() => {
        void tick();
      }, POLL_MS);
    };

    const onResume = () => {
      if (document.hidden) return;
      void tick();
      start();
    };

    void tick();
    start();
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
    };
  }, [enabled]);

  return count;
}

export function formatUnreadBadge(count: number): string {
  if (count <= 0) return "";
  return count > 9 ? "9+" : String(count);
}
