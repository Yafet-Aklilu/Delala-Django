"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCustomer } from "@/components/customer/CustomerProvider";
import { startConversationFromRequest } from "@/lib/start-conversation";
import type { CustomerPropertyRequest } from "@/lib/types";
import { formatPrice, formatRequestDate } from "@/lib/format";
import OwnerEmptyState from "@/components/owner/OwnerEmptyState";
import OwnerPageMotion from "@/components/owner/OwnerPageMotion";

const FALLBACK =
  "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1.jpg";

function RequestCard({ item }: { item: CustomerPropertyRequest }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const image = item.property.images[0]?.url || FALLBACK;
  const canMessage = item.status === "accepted";

  const onMessage = async () => {
    setError(null);
    setOpening(true);
    const result = await startConversationFromRequest(item.id, "customer");
    setOpening(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(result.href);
  };

  return (
    <li className="reveal-item request-card border border-line bg-bg-raised">
      <div className="grid gap-0 sm:grid-cols-[9.5rem_1fr]">
        <div className="relative min-h-[9rem] bg-bg-soft sm:min-h-full">
          <Image
            src={image}
            alt={item.property.title}
            fill
            className="object-cover"
            sizes="160px"
          />
        </div>
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`request-status request-status--${item.status}`}>
              {item.status_display}
            </span>
            <span className="eyebrow">{formatRequestDate(item.created_at)}</span>
          </div>
          <h2 className="display text-2xl text-ink sm:text-3xl">
            {item.property.title}
          </h2>
          <p className="text-sm font-light text-ink-soft">
            {item.property.location}
          </p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
            <p className="text-lg text-ink">
              {formatPrice(item.property.price, item.property.status)}
            </p>
            <p className="text-xs font-light text-ink-muted">
              Owner · {item.property.owner_name}
            </p>
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          {canMessage ? (
            <button
              type="button"
              className="btn btn-primary mt-2 w-fit"
              disabled={opening}
              onClick={() => void onMessage()}
            >
              {opening ? "Opening…" : "Message Owner"}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function CustomerRequestsPage() {
  const { requests, requestsError } = useCustomer();

  return (
    <OwnerPageMotion>
      <header className="reveal-item border-b border-line pb-8">
        <p className="eyebrow text-accent">My Requests</p>
        <h1 className="display mt-3 text-[clamp(2.1rem,4.5vw,3.25rem)] text-ink">
          Your inquiries
        </h1>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-ink-soft">
          Track the properties you&apos;ve requested and how owners respond.
        </p>
      </header>

      <div className="mt-10">
        {requestsError ? (
          <div className="form-error reveal-item">{requestsError}</div>
        ) : null}

        {!requestsError && requests.length === 0 ? (
          <OwnerEmptyState
            title="No requests yet"
            description="When you request a property from Explore, it will appear here with its status."
            ctaHref="/customer/explore"
            ctaLabel="Explore Properties"
          />
        ) : null}

        {!requestsError && requests.length > 0 ? (
          <ul className="space-y-4">
            {requests.map((item) => (
              <RequestCard key={item.id} item={item} />
            ))}
          </ul>
        ) : null}
      </div>
    </OwnerPageMotion>
  );
}
