"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, subscribeAuthChange } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth-types";

export type AuthSessionStatus = "loading" | "ready";

export type AuthSession = {
  status: AuthSessionStatus;
  user: AuthUser | null;
  refresh: () => Promise<void>;
};

export function useAuthSession(): AuthSession {
  const [status, setStatus] = useState<AuthSessionStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    const current = await getCurrentUser();
    setUser(current);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const current = await getCurrentUser();
      if (!active) return;
      setUser(current);
      setStatus("ready");
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return subscribeAuthChange((nextUser) => {
      setUser(nextUser);
      setStatus("ready");
    });
  }, []);

  return { status, user, refresh };
}
