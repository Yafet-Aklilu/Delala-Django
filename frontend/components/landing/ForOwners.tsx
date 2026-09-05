import Image from "next/image";
import Link from "next/link";

const OWNER_IMAGE =
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=2000&q=80";

export default function ForOwners() {
  return (
    <section id="owners" className="relative overflow-hidden border-t border-line">
      <div className="grid min-h-[36rem] lg:grid-cols-2">
        <div className="relative min-h-[22rem] lg:min-h-full">
          <Image
            src={OWNER_IMAGE}
            alt="Interior of a sunlit home ready to list"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-bg/40" />
        </div>

        <div className="section-pad flex flex-col justify-center bg-bg py-20 lg:px-16 xl:px-24">
          <p className="eyebrow reveal-item text-accent">For property owners</p>
          <h2 className="display reveal-item mt-5 max-w-[12ch] text-[clamp(2.5rem,5vw,4.5rem)] text-ink">
            You have a property.{" "}
            <span className="italic text-ink-soft">
              Find the right person directly.
            </span>
          </h2>
          <p className="reveal-item mt-8 max-w-md text-base font-light leading-relaxed text-ink-soft md:text-lg">
            List your home, apartment, office, or shop and meet people who are
            already looking, without a middleman first.
          </p>

          <div className="reveal-item mt-10">
            <Link href="/list" className="btn btn-primary">
              List your property
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
