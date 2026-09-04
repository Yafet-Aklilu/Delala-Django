import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { formatListedDate } from "@/lib/greeting";

type Props = {
  property: Property;
  featured?: boolean;
};

const FALLBACK_IMAGE =
  "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1.jpg";

export default function OwnerListingCard({ property, featured = false }: Props) {
  const image = property.images[0]?.url || FALLBACK_IMAGE;
  const listed = formatListedDate(property.listed_at);

  return (
    <article
      className={`owner-listing reveal-item group border border-line bg-bg-raised ${
        featured ? "md:grid md:grid-cols-12" : ""
      }`}
    >
      <Link
        href={`/properties/${property.id}`}
        className={`relative block overflow-hidden bg-bg-soft ${
          featured ? "min-h-[16rem] md:col-span-7 md:min-h-[22rem]" : "min-h-[14rem]"
        }`}
      >
        <Image
          src={image}
          alt={property.title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          sizes={featured ? "(max-width: 768px) 100vw, 58vw" : "(max-width: 768px) 100vw, 33vw"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="border border-line-strong bg-bg/70 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-ink backdrop-blur-sm">
            {property.status_display}
          </span>
          <span className="border border-line-strong bg-bg/70 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-ink-soft backdrop-blur-sm">
            {property.property_type_display}
          </span>
        </div>
      </Link>

      <div
        className={`flex flex-col justify-between p-5 sm:p-6 ${
          featured ? "md:col-span-5" : ""
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">
            {property.location}
          </p>
          <h3 className="display mt-2 text-2xl leading-tight text-ink sm:text-[1.75rem]">
            <Link
              href={`/properties/${property.id}`}
              className="transition-colors hover:text-accent"
            >
              {property.title}
            </Link>
          </h3>
          <p className="mt-3 text-lg font-medium text-ink">
            {formatPrice(property.price, property.status)}
          </p>
          {listed ? (
            <p className="mt-2 text-sm font-light text-ink-muted">
              Listed {listed}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Link
            href={`/properties/${property.id}`}
            className="btn btn-ghost !min-h-10 !px-3 !text-[0.7rem]"
          >
            View
          </Link>
          <span
            className="btn btn-ghost !min-h-10 !cursor-not-allowed !px-3 !text-[0.7rem] !opacity-45"
            title="Edit will be available when the listing API is wired"
            aria-disabled="true"
          >
            Edit
          </span>
          <span
            className="btn btn-ghost !min-h-10 !cursor-not-allowed !px-3 !text-[0.7rem] !opacity-45"
            title="Delete will be available when the listing API is wired"
            aria-disabled="true"
          >
            Delete
          </span>
        </div>
      </div>
    </article>
  );
}
