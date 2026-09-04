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
  fetchMarketplaceProperties,
  getCustomerRequests,
  getNotifications,
  markNotificationsRead,
} from "@/lib/api";
import type { AuthUser } from "@/lib/auth-types";
import type {
  AppNotification,
  CustomerPropertyRequest,
  Property,
} from "@/lib/types";

type CustomerContextValue = {
  user: AuthUser;
  properties: Property[];
  loading: boolean;
  propertiesError: string | null;
  requests: CustomerPropertyRequest[];
  requestsError: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  refreshProperties: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationsRead: (options: {
    ids?: number[];
    all?: boolean;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) {
    throw new Error("useCustomer must be used within CustomerProvider");
  }
  return ctx;
}

export default function CustomerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [requests, setRequests] = useState<CustomerPropertyRequest[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshProperties = useCallback(async () => {
    const result = await fetchMarketplaceProperties();
    setProperties(result.properties);
    setPropertiesError(result.error);
  }, []);

  const refreshRequests = useCallback(async () => {
    const result = await getCustomerRequests();
    setRequests(result.requests);
    setRequestsError(result.error);
  }, []);

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

      if (!current || current.user_type !== "customer") {
        router.replace("/login");
        return;
      }

      setUser(current);
      const [propsResult, requestsResult, notifResult] = await Promise.all([
        fetchMarketplaceProperties(),
        getCustomerRequests(),
        getNotifications(),
      ]);
      if (!active) return;
      setProperties(propsResult.properties);
      setPropertiesError(propsResult.error);
      setRequests(requestsResult.requests);
      setRequestsError(requestsResult.error);
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
      requests,
      requestsError,
      notifications,
      unreadCount,
      refreshProperties,
      refreshRequests,
      refreshNotifications,
      markNotificationsRead: markRead,
      signOut,
    };
  }, [
    user,
    properties,
    loading,
    propertiesError,
    requests,
    requestsError,
    notifications,
    unreadCount,
    refreshProperties,
    refreshRequests,
    refreshNotifications,
    markRead,
    signOut,
  ]);

  if (loading || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="eyebrow text-ink-muted">Loading your Delala…</p>
      </div>
    );
  }

  return (
    <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
  );
}
