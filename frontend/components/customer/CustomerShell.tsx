"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCustomer } from "./CustomerProvider";
import NotificationBell from "@/components/notifications/NotificationBell";
import UnreadMessageBadge from "@/components/messages/UnreadMessageBadge";
import { useUnreadMessageCount } from "@/lib/useUnreadMessageCount";

const navItems = [
  { href: "/", label: "Home", exact: true },
  { href: "/customer", label: "Dashboard", exact: true },
  { href: "/customer/explore", label: "Explore", exact: false },
  { href: "/customer/requests", label: "My Requests", exact: false },
  { href: "/customer/messages", label: "Messages", exact: false },
  { href: "/customer/profile", label: "Profile", exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const {
    user,
    signOut,
    notifications,
    unreadCount,
    markNotificationsRead,
  } = useCustomer();
  const [menuOpen, setMenuOpen] = useState(false);
  const messageUnreadCount = useUnreadMessageCount(true);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] flex-col border-r border-line bg-bg-raised lg:flex">
        <div className="border-b border-line px-6 py-7">
          <Link href="/" className="inline-flex items-baseline gap-2">
            <span className="display text-2xl tracking-tight">Delala</span>
            <span lang="am" className="text-sm text-accent">
              ደላላ
            </span>
          </Link>
          <p className="mt-3 text-xs font-light tracking-wide text-ink-muted">
            Find a place
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const isMessages = item.label === "Messages";
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`owner-nav-link ${active ? "is-active" : ""}`}
                aria-label={
                  isMessages && messageUnreadCount > 0
                    ? `Messages, ${messageUnreadCount} unread`
                    : undefined
                }
              >
                {item.label}
                {isMessages ? (
                  <UnreadMessageBadge count={messageUnreadCount} />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-line p-4">
          <p className="px-1 text-xs text-ink-muted">
            {user.first_name || user.username}
          </p>
          <Link href="/customer/explore" className="btn btn-primary w-full">
            Explore Properties
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn btn-ghost w-full"
          >
            Log out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-md lg:hidden">
        <div className="section-pad flex h-14 items-center justify-between">
          <Link href="/" className="display text-xl">
            Delala
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markNotificationsRead}
            />
            <Link
              href="/customer/explore"
              className="btn btn-primary !min-h-9 !px-3 !text-[0.68rem]"
            >
              Explore
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center"
            >
              <span
                className={`absolute h-px w-5 bg-ink transition-transform ${
                  menuOpen ? "rotate-45" : "-translate-y-1.5"
                }`}
              />
              <span
                className={`absolute h-px w-5 bg-ink transition-opacity ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute h-px w-5 bg-ink transition-transform ${
                  menuOpen ? "-rotate-45" : "translate-y-1.5"
                }`}
              />
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="section-pad border-t border-line pb-5 pt-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                const isMessages = item.label === "Messages";
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`owner-nav-link ${active ? "is-active" : ""}`}
                    aria-label={
                      isMessages && messageUnreadCount > 0
                        ? `Messages, ${messageUnreadCount} unread`
                        : undefined
                    }
                  >
                    {item.label}
                    {isMessages ? (
                      <UnreadMessageBadge count={messageUnreadCount} />
                    ) : null}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => void signOut()}
                className="owner-nav-link mt-2 text-left text-ink-muted"
              >
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="lg:pl-[15.5rem]">
        <div className="app-topbar hidden border-b border-line bg-bg/95 backdrop-blur-md lg:block">
          <div className="section-pad flex h-14 items-center justify-end">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={markNotificationsRead}
            />
          </div>
        </div>
        <main className="section-pad pb-28 pt-8 lg:pb-16 lg:pt-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-6">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const isMessages = item.label === "Messages";
            const label =
              item.label === "My Requests"
                ? "Requests"
                : item.label === "Dashboard"
                  ? "Dash"
                  : isMessages
                    ? "Inbox"
                    : item.label;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 text-[0.6rem] tracking-[0.02em] ${
                  active ? "text-accent" : "text-ink-muted"
                }`}
                aria-label={
                  isMessages && messageUnreadCount > 0
                    ? `Messages, ${messageUnreadCount} unread`
                    : undefined
                }
              >
                <span
                  className={`h-1 w-1 rounded-full ${
                    active ? "bg-accent" : "bg-transparent"
                  }`}
                />
                {label}
                {isMessages ? (
                  <UnreadMessageBadge
                    count={messageUnreadCount}
                    className="messages-nav-badge--mobile"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
