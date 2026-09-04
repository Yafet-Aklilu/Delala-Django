"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getOwnerRequests, updateRequestStatus } from "@/lib/api";
import type { OwnerPropertyRequest, RequestStatus } from "@/lib/types";
import { formatPrice, formatRequestDate } from "@/lib/format";
import OwnerEmptyState from "@/components/owner/OwnerEmptyState";
import OwnerPageMotion from "@/components/owner/OwnerPageMotion";
import { useOwner } from "@/components/owner/OwnerProvider";
import { startConversationFromRequest } from "@/lib/start-conversation";

const FALLBACK =
  "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1.jpg";

export default function OwnerRequestsPage() {
  const router = useRouter();
  const { refreshNotifications } = useOwner();
  const [requests, setRequests] = useState<OwnerPropertyRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getOwnerRequests();
    setRequests(result.requests);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = async (
    requestId: number,
    status: Extract<RequestStatus, "accepted" | "declined">,
  ) => {
    setActionError(null);
    setUpdatingId(requestId);
    const result = await updateRequestStatus(requestId, status);
    setUpdatingId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setRequests((prev) =>
      prev.map((item) => (item.id === requestId ? result.request : item)),
    );
    await refreshNotifications();
  };

  const handleMessage = async (requestId: number) => {
    setActionError(null);
    setOpeningId(requestId);
    const result = await startConversationFromRequest(requestId, "owner");
    setOpeningId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    router.push(result.href);
  };

  return (
    <OwnerPageMotion>
      <header className="reveal-item border-b border-line pb-8">
        <p className="eyebrow text-accent">Requests</p>
        <h1 className="display mt-3 text-[clamp(2.1rem,4.5vw,3.25rem)] text-ink">
          Property inquiries
        </h1>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-ink-soft">
          Review who has requested your listings and respond with Accept or
          Decline.
        </p>
      </header>

      <div className="mt-10">
        {loading ? (
          <p className="eyebrow reveal-item text-ink-muted">Loading requests…</p>
        ) : null}

        {error ? <div className="form-error reveal-item">{error}</div> : null}
        {actionError ? (
          <div className="form-error reveal-item mb-4">{actionError}</div>
        ) : null}

        {!loading && !error && requests.length === 0 ? (
          <OwnerEmptyState
            title="No requests yet"
            description="When a customer requests one of your properties, their inquiry and contact details will appear here."
          />
        ) : null}

        {!loading && requests.length > 0 ? (
          <ul className="space-y-4">
            {requests.map((item) => {
              const image = item.property.images[0]?.url || FALLBACK;
              const busy = updatingId === item.id;
              const opening = openingId === item.id;
              return (
                <li
                  key={item.id}
                  className="reveal-item request-card border border-line bg-bg-raised"
                >
                  <div className="grid gap-0 lg:grid-cols-[10rem_1fr]">
                    <div className="relative min-h-[10rem] bg-bg-soft lg:min-h-full">
                      <Image
                        src={image}
                        alt={item.property.title}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    </div>
                    <div className="flex flex-col gap-4 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`request-status request-status--${item.status}`}
                        >
                          {item.status_display}
                        </span>
                        <span className="eyebrow">
                          {formatRequestDate(item.created_at)}
                        </span>
                      </div>

                      <div>
                        <h2 className="display text-2xl text-ink sm:text-3xl">
                          {item.property.title}
                        </h2>
                        <p className="mt-2 text-sm font-light text-ink-soft">
                          {item.property.location} ·{" "}
                          {formatPrice(
                            item.property.price,
                            item.property.status,
                          )}
                        </p>
                      </div>

                      <div className="border-t border-line pt-4">
                        <p className="eyebrow">Customer</p>
                        <p className="mt-2 text-base text-ink">
                          {item.customer_name}
                        </p>
                        <div className="mt-2 space-y-1 text-sm font-light text-ink-soft">
                          <p>{item.customer_email || "No email on file"}</p>
                          <p>{item.customer_phone || "No phone on file"}</p>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-col gap-3 pt-2">
                        {item.status === "pending" ? (
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              className="btn btn-primary w-full sm:w-auto"
                              disabled={busy}
                              onClick={() =>
                                void handleStatus(item.id, "accepted")
                              }
                            >
                              {busy ? "Updating…" : "Accept"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost w-full sm:w-auto"
                              disabled={busy}
                              onClick={() =>
                                void handleStatus(item.id, "declined")
                              }
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}

                        {item.status === "accepted" ? (
                          <>
                            <p className="eyebrow text-accent">Request accepted</p>
                            <button
                              type="button"
                              className="btn btn-primary w-fit"
                              disabled={opening}
                              onClick={() => void handleMessage(item.id)}
                            >
                              {opening ? "Opening…" : "Message Customer"}
                            </button>
                          </>
                        ) : null}

                        {item.status === "declined" ? (
                          <p className="eyebrow text-ink-muted">
                            Request declined
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </OwnerPageMotion>
  );
}
