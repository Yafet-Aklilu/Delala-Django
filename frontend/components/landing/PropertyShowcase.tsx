"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth-types";
import type { Property } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { getOwnerProperties } from "@/lib/api";
import PropertyDetailModal from "@/components/property/PropertyDetailModal";

type Props = {
  properties: Property[];
  user?: AuthUser | null;
};

const FALLBACK_IMAGE =
  "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1.jpg";

type Tile = {
  property: Property | null;
  id: string;
  title: string;
  location: string;
  price: string;
  status: string;
  image: string;
};

function toTiles(list: Property[]): Tile[] {
  return list.map((property) => ({
    property,
    id: String(property.id),
    title: property.title,
    location: property.location,
    price: formatPrice(property.price, property.status),
    status: property.status_display,
    image: property.images[0]?.url || FALLBACK_IMAGE,
  }));
}

function TileCard({
  tile,
  featured,
  onOpen,
}: {
  tile: Tile;
  featured?: boolean;
  onOpen?: (property: Property) => void;
}) {
  const className = featured
    ? "property-tile reveal-item group relative min-h-[28rem] md:col-span-7 md:min-h-[36rem]"
    : "property-tile reveal-item group relative min-h-[16rem] md:min-h-[17.25rem]";

  const body = (
    <>
      <Image
        src={tile.image}
        alt={tile.title}
        fill
        className="object-cover"
        sizes={
          featured
            ? "(max-width: 768px) 100vw, 58vw"
            : "(max-width: 768px) 100vw, 40vw"
        }
      />
      <div className="property-meta">
        <p className="eyebrow text-accent">{tile.status}</p>
        <h3
          className={`display mt-2 text-ink ${
            featured ? "text-3xl md:text-4xl" : "text-2xl"
          }`}
        >
          {tile.title}
        </h3>
        <div
          className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft ${
            featured ? "mt-3" : "mt-2"
          }`}
        >
          <span>{tile.location}</span>
          <span className="text-ink">{tile.price}</span>
        </div>
      </div>
    </>
  );

  if (onOpen && tile.property) {
    return (
      <button
        type="button"
        className={`${className} w-full cursor-pointer border-0 bg-transparent p-0 text-left`}
        onClick={() => onOpen(tile.property!)}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export default function PropertyShowcase({
  properties,
  user = null,
}: Props) {
  const isOwner = user?.user_type === "owner";
  const [ownerProperties, setOwnerProperties] = useState<Property[] | null>(
    null,
  );
  const [selected, setSelected] = useState<Property | null>(null);

  useEffect(() => {
    if (!isOwner) {
      setOwnerProperties(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await getOwnerProperties();
      if (cancelled) return;
      setOwnerProperties(result.properties);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  const marketplaceTiles = toTiles(properties).slice(0, 3);
  const ownerTiles =
    ownerProperties != null ? toTiles(ownerProperties).slice(0, 3) : [];

  const ctaHref = isOwner ? "/owner/list-property" : "/customer/explore";
  const ctaLabel = isOwner ? "List your property" : "View all listings";

  const showOwnerEmpty =
    isOwner && ownerProperties != null && ownerProperties.length === 0;
  const showOwnerLoading = isOwner && ownerProperties == null;
  const showcaseTiles = isOwner ? ownerTiles : marketplaceTiles;
  const [featured, ...rest] = showcaseTiles;

  return (
    <section
      id="explore"
      className="section-pad border-t border-line bg-bg py-24 md:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 border-b border-line pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow reveal-item">
              {isOwner ? "Your places" : "Featured places"}
            </p>
            <h2 className="display reveal-item mt-4 max-w-[12ch] text-[clamp(2.4rem,5.5vw,4.25rem)] text-ink">
              {isOwner ? (
                <>
                  Places you have{" "}
                  <span className="italic text-ink-soft">listed.</span>
                </>
              ) : (
                <>
                  Spaces worth{" "}
                  <span className="italic text-ink-soft">looking closer.</span>
                </>
              )}
            </h2>
          </div>
          <Link
            href={ctaHref}
            className="reveal-item nav-link w-fit self-start md:self-auto"
          >
            {ctaLabel}
          </Link>
        </div>

        {showOwnerLoading ? (
          <p className="reveal-item mt-10 text-sm text-ink-muted md:mt-14">
            Loading your listings…
          </p>
        ) : null}

        {showOwnerEmpty ? (
          <div className="reveal-item mt-10 flex flex-col items-start gap-5 border border-line bg-bg-raised px-6 py-10 md:mt-14 md:px-10">
            <p className="display text-2xl text-ink md:text-3xl">
              You haven&apos;t posted any place
            </p>
            <p className="max-w-md text-sm font-light text-ink-soft">
              List a property to show it here and connect with people looking on
              Delala.
            </p>
            <Link href="/owner/list-property" className="btn btn-primary">
              List your property
            </Link>
          </div>
        ) : null}

        {!showOwnerEmpty && !showOwnerLoading && featured ? (
          <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-12 md:gap-5">
            <TileCard
              tile={featured}
              featured
              onOpen={isOwner ? undefined : setSelected}
            />
            {rest.length > 0 ? (
              <div className="grid gap-4 md:col-span-5 md:gap-5">
                {rest.slice(0, 2).map((tile) => (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    onOpen={isOwner ? undefined : setSelected}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!isOwner && marketplaceTiles.length === 0 ? (
          <p className="reveal-item mt-10 text-sm text-ink-muted md:mt-14">
            No featured listings yet. Explore when new places are posted.
          </p>
        ) : null}
      </div>

      {!isOwner ? (
        <PropertyDetailModal
          property={selected}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
