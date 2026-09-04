"use client";

import Link from "next/link";
import { useOwner } from "@/components/owner/OwnerProvider";
import OwnerListingCard from "@/components/owner/OwnerListingCard";
import OwnerEmptyState from "@/components/owner/OwnerEmptyState";
import OwnerPageMotion from "@/components/owner/OwnerPageMotion";

export default function OwnerPropertiesPage() {
  const { properties, propertiesError } = useOwner();

  return (
    <OwnerPageMotion>
      <header className="reveal-item flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-accent">My Properties</p>
          <h1 className="display mt-3 text-[clamp(2.1rem,4.5vw,3.25rem)] text-ink">
            Your listings
          </h1>
          <p className="mt-3 max-w-lg text-sm font-light leading-relaxed text-ink-soft sm:text-base">
            {properties.length === 0
              ? "No listings yet."
              : `${properties.length} propert${properties.length === 1 ? "y" : "ies"} on Delala.`}
          </p>
        </div>
        <Link href="/owner/list-property" className="btn btn-primary w-fit">
          List a Property
        </Link>
      </header>

      <div className="mt-8">
        {propertiesError ? (
          <div className="form-error reveal-item">{propertiesError}</div>
        ) : null}

        {!propertiesError && properties.length === 0 ? (
          <OwnerEmptyState
            title="List your first property"
            description="Add photos and details, then connect directly with people who are looking — without the traditional middleman."
            ctaHref="/owner/list-property"
            ctaLabel="List your first property"
          />
        ) : null}

        {properties.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {properties.map((property) => (
              <OwnerListingCard key={property.id} property={property} />
            ))}
          </div>
        ) : null}
      </div>
    </OwnerPageMotion>
  );
}
