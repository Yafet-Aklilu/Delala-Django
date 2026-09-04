import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/lib/types";
import { formatPrice } from "@/lib/format";

type Props = {
  properties: Property[];
};

const FALLBACKS = [
  {
    id: "f1",
    title: "Apartment in Piassa",
    location: "Addis Ababa · Piassa",
    price: "ETB 30,000/mo",
    status: "For Rent",
    image:
      "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1_CspEu5g.jpg",
  },
  {
    id: "f2",
    title: "Cozy Home",
    location: "Addis Ababa · Piassa",
    price: "ETB 12,000,000",
    status: "For Sale",
    image: "/istockphoto-1442148484-612x612.jpg",
  },
  {
    id: "f3",
    title: "Quiet residence",
    location: "Addis Ababa",
    price: "Coming soon",
    status: "Featured",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
  },
];

export default function PropertyShowcase({ properties }: Props) {
  const items =
    properties.length > 0
      ? properties.map((property) => ({
          id: String(property.id),
          title: property.title,
          location: property.location,
          price: formatPrice(property.price, property.status),
          status: property.status_display,
          image:
            property.images[0]?.url ||
            "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1.jpg",
          href: `/properties/${property.id}`,
        }))
      : FALLBACKS.map((item) => ({ ...item, href: "#explore" }));

  // Ensure at least 3 tiles for composition when API returns few items
  const showcase = [...items];
  if (showcase.length === 1) {
    showcase.push(
      {
        id: "extra-1",
        title: "More listings soon",
        location: "Across Addis Ababa",
        price: "Explore",
        status: "Marketplace",
        image:
          "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
        href: "#explore",
      },
      {
        id: "extra-2",
        title: "List your space",
        location: "Reach people directly",
        price: "Owners",
        status: "Open",
        image:
          "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=80",
        href: "/list",
      },
    );
  } else if (showcase.length === 2) {
    showcase.push({
      id: "extra-1",
      title: "List your space",
      location: "Reach people directly",
      price: "For owners",
      status: "Open",
      image:
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=80",
      href: "/list",
    });
  }

  const [featured, ...rest] = showcase;

  return (
    <section id="explore" className="section-pad border-t border-line bg-bg py-24 md:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 border-b border-line pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow reveal-item">Featured places</p>
            <h2 className="display reveal-item mt-4 max-w-[12ch] text-[clamp(2.4rem,5.5vw,4.25rem)] text-ink">
              Spaces worth{" "}
              <span className="italic text-ink-soft">looking closer.</span>
            </h2>
          </div>
          <Link
            href="/explore"
            className="reveal-item nav-link w-fit self-start md:self-auto"
          >
            View all listings
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-12 md:gap-5">
          <Link
            href={featured.href}
            className="property-tile reveal-item group relative min-h-[28rem] md:col-span-7 md:min-h-[36rem]"
          >
            <Image
              src={featured.image}
              alt={featured.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 58vw"
            />
            <div className="property-meta">
              <p className="eyebrow text-accent">{featured.status}</p>
              <h3 className="display mt-2 text-3xl text-ink md:text-4xl">
                {featured.title}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                <span>{featured.location}</span>
                <span className="text-ink">{featured.price}</span>
              </div>
            </div>
          </Link>

          <div className="grid gap-4 md:col-span-5 md:gap-5">
            {rest.slice(0, 2).map((item, index) => (
              <Link
                key={item.id}
                href={item.href}
                className={`property-tile reveal-item group relative min-h-[16rem] ${
                  index === 0 ? "md:min-h-[17.25rem]" : "md:min-h-[17.25rem]"
                }`}
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
                <div className="property-meta">
                  <p className="eyebrow text-accent">{item.status}</p>
                  <h3 className="display mt-2 text-2xl text-ink">{item.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                    <span>{item.location}</span>
                    <span className="text-ink">{item.price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
