"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppNotification } from "@/lib/types";
import { formatRequestDate } from "@/lib/format";

type Props = {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (options: { ids?: number[]; all?: boolean }) => Promise<void>;
};

type PanelCoords = {
  top: number;
  right: number;
  width: number;
};

export default function NotificationBell({
  notifications,
  unreadCount,
  onMarkRead,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const right = Math.max(12, window.innerWidth - rect.right);
    const top = rect.bottom + 10;
    setCoords({ top, right, width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();

    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await onMarkRead({ all: true });
    }
  };

  return (
    <div className="notification-bell">
      <button
        ref={triggerRef}
        type="button"
        className="notification-bell__trigger"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => void handleToggle()}
      >
        <span className="notification-bell__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm8-6V11a8 8 0 1 0-16 0v5l-2 2v1h20v-1l-2-2Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {unreadCount > 0 ? (
          <span className="notification-bell__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {mounted && open && coords
        ? createPortal(
            <div
              ref={panelRef}
              className="notification-bell__panel notification-bell__panel--portal"
              role="dialog"
              aria-label="Notifications"
              style={{
                top: coords.top,
                right: coords.right,
                width: coords.width,
              }}
            >
              <div className="notification-bell__head">
                <p className="eyebrow text-accent">Notifications</p>
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    className="nav-link !text-[0.65rem]"
                    onClick={() => void onMarkRead({ all: true })}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>

              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm font-light text-ink-muted">
                  No notifications yet.
                </p>
              ) : (
                <ul className="notification-bell__list">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      {item.link ? (
                        <Link
                          href={item.link}
                          className={`notification-bell__item${
                            item.is_read ? "" : " is-unread"
                          }`}
                          onClick={() => {
                            setOpen(false);
                            if (!item.is_read) {
                              void onMarkRead({ ids: [item.id] });
                            }
                          }}
                        >
                          <NotificationBody item={item} />
                        </Link>
                      ) : (
                        <div
                          className={`notification-bell__item${
                            item.is_read ? "" : " is-unread"
                          }`}
                        >
                          <NotificationBody item={item} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function NotificationBody({ item }: { item: AppNotification }) {
  return (
    <>
      <p className="text-sm text-ink">{item.title}</p>
      <p className="mt-1 text-xs font-light leading-relaxed text-ink-soft">
        {item.message}
      </p>
      <p className="mt-2 text-[0.65rem] tracking-[0.02em] text-ink-muted">
        {formatRequestDate(item.created_at)}
      </p>
    </>
  );
}
