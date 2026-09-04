"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import {
  getNotifications,
  getOwnerProperties,
  markNotificationsRead,
} from "@/lib/api";
import type { AuthUser } from "@/lib/auth-types";
import type { AppNotification, Property } from "@/lib/types";

type OwnerContextValue = {
  user: AuthUser;
  properties: Property[];
  loading: boolean;
  propertiesError: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  refreshProperties: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationsRead: (options: {
    ids?: number[];
    all?: boolean;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const OwnerContext = createContext<OwnerContextValue | null>(null);

export function useOwner() {
  const ctx = useContext(OwnerContext);
  if (!ctx) {
    throw new Error("useOwner must be used within OwnerProvider");
  }
  return ctx;
}

export default function OwnerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshProperties = useCallback(async () => {
    const result = await getOwnerProperties();
    if (result.status === 401 || result.status === 403) {
      router.replace("/login");
      return;
    }
    setProperties(result.properties);
    setPropertiesError(result.error);
  }, [router]);

  const refreshNotifications = useCallback(async () => {
    const result = await getNotifications();
    setNotifications(result.notifications);
    setUnreadCount(result.unreadCount);
  }, []);

  const markRead = useCallback(
    async (options: { ids?: number[]; all?: boolean }) => {
      const result = await markNotificationsRead(options);
      if (!result.ok) return;
      setUnreadCount(result.unreadCount);
      setNotifications((prev) =>
        prev.map((item) => {
          if (options.all) return { ...item, is_read: true };
          if (options.ids?.includes(item.id)) {
            return { ...item, is_read: true };
          }
          return item;
        }),
      );
    },
    [],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      const current = await getCurrentUser();
      if (!active) return;

      if (!current || current.user_type !== "owner") {
        router.replace("/login");
        return;
      }

      setUser(current);
      const [propsResult, notifResult] = await Promise.all([
        getOwnerProperties(),
        getNotifications(),
      ]);
      if (!active) return;

      if (propsResult.status === 401 || propsResult.status === 403) {
        router.replace("/login");
        return;
      }

      setProperties(propsResult.properties);
      setPropertiesError(propsResult.error);
      setNotifications(notifResult.notifications);
      setUnreadCount(notifResult.unreadCount);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const signOut = useCallback(async () => {
    await logout();
    // Client auth already cleared via emitAuthChange(null) inside logout().
    router.replace("/");
  }, [router]);

  const value = useMemo(() => {
    if (!user) return null;
    return {
      user,
      properties,
      loading,
      propertiesError,
      notifications,
      unreadCount,
      refreshProperties,
      refreshNotifications,
      markNotificationsRead: markRead,
      signOut,
    };
  }, [
    user,
    properties,
    loading,
    propertiesError,
    notifications,
    unreadCount,
    refreshProperties,
    refreshNotifications,
    markRead,
    signOut,
  ]);

  if (loading || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="eyebrow text-ink-muted">Loading owner workspace…</p>
      </div>
    );
  }

  return (
    <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>
  );
}
