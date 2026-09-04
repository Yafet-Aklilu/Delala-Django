"use client";

import Link from "next/link";
import { useOwner } from "@/components/owner/OwnerProvider";
import OwnerListingCard from "@/components/owner/OwnerListingCard";
import OwnerEmptyState from "@/components/owner/OwnerEmptyState";
import OwnerPageMotion from "@/components/owner/OwnerPageMotion";
import { displayFirstName, greetingForNow } from "@/lib/greeting";

export default function OwnerDashboard() {
  const { user, properties, propertiesError } = useOwner();
  const name = displayFirstName(user);
  const forSale = properties.filter((p) => p.status === "sale").length;
  const forRent = properties.filter((p) => p.status === "rent").length;
  const recent = properties.slice(0, 3);

  return (
    <OwnerPageMotion>
      <header className="reveal-item border-b border-line pb-8">
        <p className="eyebrow text-accent">Overview</p>
        <h1 className="display mt-3 text-[clamp(2.2rem,5vw,3.6rem)] text-ink">
          {greetingForNow()}, {name}.
        </h1>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-ink-soft">
          Manage your listings on Delala and keep your properties visible to
          people looking directly.
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { label: "My Properties", value: properties.length },
          { label: "For Sale", value: forSale },
          { label: "For Rent", value: forRent },
        ].map((metric) => (
          <div
            key={metric.label}
            className="reveal-item border border-line bg-bg-raised px-5 py-6"
          >
            <p className="eyebrow">{metric.label}</p>
            <p className="display mt-3 text-4xl text-ink sm:text-5xl">
              {metric.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <div className="reveal-item mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Current listings</p>
            <h2 className="display mt-2 text-3xl text-ink">Your properties</h2>
          </div>
          <Link href="/owner/properties" className="nav-link w-fit">
            View all
          </Link>
        </div>

        {propertiesError ? (
          <div className="form-error reveal-item">{propertiesError}</div>
        ) : null}

        {!propertiesError && properties.length === 0 ? (
          <OwnerEmptyState
            title="List your first property"
            description="When you list a home, apartment, office, or shop, it will appear here for people looking on Delala."
            ctaHref="/owner/list-property"
            ctaLabel="List a Property"
          />
        ) : null}

        {recent.length > 0 ? (
          <div className="grid gap-4">
            {recent.map((property, index) => (
              <OwnerListingCard
                key={property.id}
                property={property}
                featured={index === 0}
              />
            ))}
          </div>
        ) : null}
      </section>
    </OwnerPageMotion>
  );
}
