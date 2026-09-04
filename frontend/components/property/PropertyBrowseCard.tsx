"use client";

import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/lib/types";
import { formatPrice } from "@/lib/format";

type Props = {
  property: Property;
  className?: string;
  /** When provided, opens locally (e.g. detail modal) instead of navigating. */
  onSelect?: (property: Property) => void;
};

const FALLBACK =
  "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1.jpg";

export default function PropertyBrowseCard({
  property,
  className = "",
  onSelect,
}: Props) {
  const image = property.images[0]?.url || FALLBACK;
  const tileClass = `property-tile reveal-item group relative min-h-[18rem] border border-line ${className}`;

  const meta = (
    <div className="property-meta">
      <div className="flex flex-wrap gap-2">
        <span className="eyebrow text-accent">{property.status_display}</span>
        <span className="eyebrow">{property.property_type_display}</span>
      </div>
      <h3 className="display mt-2 text-2xl text-ink">{property.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
        <span>{property.location}</span>
        <span className="text-ink">
          {formatPrice(property.price, property.status)}
        </span>
      </div>
    </div>
  );

  const media = (
    <Image
      src={image}
      alt={property.title}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={`${tileClass} property-tile--button w-full text-left`}
        onClick={() => onSelect(property)}
      >
        {media}
        {meta}
      </button>
    );
  }

  return (
    <Link href={`/properties/${property.id}`} className={tileClass}>
      {media}
      {meta}
    </Link>
  );
}
