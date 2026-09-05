"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCustomer } from "@/components/customer/CustomerProvider";
import PropertyBrowseCard from "@/components/property/PropertyBrowseCard";
import PropertyDetailModal from "@/components/property/PropertyDetailModal";
import OwnerEmptyState from "@/components/owner/OwnerEmptyState";
import OwnerPageMotion from "@/components/owner/OwnerPageMotion";
import { displayFirstName, greetingForNow } from "@/lib/greeting";
import { formatPrice, formatRequestDate } from "@/lib/format";
import type { Property } from "@/lib/types";

const FALLBACK =
  "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1.jpg";

export default function CustomerDashboard() {
  const {
    user,
    properties,
    propertiesError,
    requests,
    requestsError,
    refreshNotifications,
    refreshRequests,
  } = useCustomer();
  const [selected, setSelected] = useState<Property | null>(null);
  const name = displayFirstName(user);
  const featured = properties.slice(0, 4);
  const recentRequests = requests.slice(0, 3);

  return (
    <OwnerPageMotion>
      <header className="reveal-item border-b border-line pb-8">
        <p className="eyebrow text-accent">Your Delala</p>
        <h1 className="display mt-3 text-[clamp(2.2rem,5vw,3.6rem)] text-ink">
          {greetingForNow()}, {name}.
        </h1>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-ink-soft">
          Browse places on Delala and connect with owners directly, without the
          traditional middleman.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/customer/explore" className="btn btn-primary w-fit">
            Explore Properties
          </Link>
          <Link href="/" className="btn btn-ghost w-fit">
            Delala Home
          </Link>
        </div>
      </header>

      <section className="mt-12">
        <div className="reveal-item mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Discover</p>
            <h2 className="display mt-2 text-3xl text-ink">Places to look at</h2>
          </div>
          <Link href="/customer/explore" className="nav-link w-fit">
            View all
          </Link>
        </div>

        {propertiesError ? (
          <div className="form-error reveal-item">{propertiesError}</div>
        ) : null}

        {!propertiesError && featured.length === 0 ? (
          <OwnerEmptyState
            title="No listings yet"
            description="When properties are listed on Delala, they will appear here for you to explore."
          />
        ) : null}

        {featured.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((property) => (
              <PropertyBrowseCard
                key={property.id}
                property={property}
                onSelect={setSelected}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-14">
        <div className="reveal-item mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Your activity</p>
            <h2 className="display mt-2 text-3xl text-ink">Requests</h2>
          </div>
          <Link href="/customer/requests" className="nav-link w-fit">
            My Requests
          </Link>
        </div>

        {requestsError ? (
          <div className="form-error reveal-item">{requestsError}</div>
        ) : null}

        {!requestsError && recentRequests.length === 0 ? (
          <OwnerEmptyState
            title="Your property requests will appear here"
            description="When you reach out about a listing, those inquiries will show up in My Requests."
            ctaHref="/customer/requests"
            ctaLabel="Open My Requests"
          />
        ) : null}

        {!requestsError && recentRequests.length > 0 ? (
          <ul className="space-y-4">
            {recentRequests.map((item) => {
              const image = item.property.images[0]?.url || FALLBACK;
              return (
                <li
                  key={item.id}
                  className="reveal-item request-card border border-line bg-bg-raised"
                >
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
                        <span
                          className={`request-status request-status--${item.status}`}
                        >
                          {item.status_display}
                        </span>
                        <span className="eyebrow">
                          {formatRequestDate(item.created_at)}
                        </span>
                      </div>
                      <h3 className="display text-2xl text-ink sm:text-3xl">
                        {item.property.title}
                      </h3>
                      <p className="text-sm font-light text-ink-soft">
                        {item.property.location}
                      </p>
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
                        <p className="text-lg text-ink">
                          {formatPrice(
                            item.property.price,
                            item.property.status,
                          )}
                        </p>
                        <p className="text-xs font-light text-ink-muted">
                          Owner · {item.property.owner_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <PropertyDetailModal
        property={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onRequestCreated={() => {
          void refreshNotifications();
          void refreshRequests();
        }}
      />
    </OwnerPageMotion>
  );
}
