"use client";

import { useMemo, useState } from "react";
import { useCustomer } from "@/components/customer/CustomerProvider";
import PropertyBrowseCard from "@/components/property/PropertyBrowseCard";
import PropertyDetailModal from "@/components/property/PropertyDetailModal";
import OwnerEmptyState from "@/components/owner/OwnerEmptyState";
import OwnerPageMotion from "@/components/owner/OwnerPageMotion";
import CustomSelect from "@/components/ui/CustomSelect";
import type { Property } from "@/lib/types";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "For Rent" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
];

export default function CustomerExplorePage() {
  const { properties, propertiesError, refreshNotifications, refreshRequests } =
    useCustomer();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Property | null>(null);

  // Local UI filtering only — no backend filter API yet.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter((property) => {
      const matchesQuery =
        !q ||
        property.title.toLowerCase().includes(q) ||
        property.location.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || property.status === statusFilter;
      const matchesType =
        typeFilter === "all" || property.property_type === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [properties, query, statusFilter, typeFilter]);

  return (
    <OwnerPageMotion>
      <header className="reveal-item border-b border-line pb-8">
        <p className="eyebrow text-accent">Explore</p>
        <h1 className="display mt-3 text-[clamp(2.1rem,4.5vw,3.25rem)] text-ink">
          Find a place
        </h1>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-ink-soft">
          Browse real listings on Delala. Reach owners directly when something
          fits.
        </p>
      </header>

      <div className="reveal-item mt-8 grid gap-3 border border-line bg-bg-raised p-4 sm:grid-cols-3 sm:p-5">
        <div className="field sm:col-span-1">
          <label htmlFor="explore-q">Search</label>
          <input
            id="explore-q"
            type="search"
            placeholder="Neighbourhood or title"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="explore-status">Sale / Rent</label>
          <CustomSelect
            id="explore-status"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={setStatusFilter}
            aria-label="Sale / Rent"
          />
        </div>
        <div className="field">
          <label htmlFor="explore-type">Type</label>
          <CustomSelect
            id="explore-type"
            value={typeFilter}
            options={TYPE_FILTER_OPTIONS}
            onChange={setTypeFilter}
            aria-label="Type"
          />
        </div>
        <p className="sm:col-span-3 text-xs font-light text-ink-muted">
          Filters refine the listings already loaded from Delala. Server-side
          search will connect later.
        </p>
      </div>

      <div className="mt-8">
        {propertiesError ? (
          <div className="form-error reveal-item">{propertiesError}</div>
        ) : null}

        {!propertiesError && filtered.length === 0 ? (
          <OwnerEmptyState
            title="No matching places"
            description="Try clearing filters, or check back when more listings are posted."
          />
        ) : null}

        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((property) => (
              <PropertyBrowseCard
                key={property.id}
                property={property}
                onSelect={setSelected}
              />
            ))}
          </div>
        ) : null}
      </div>

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
