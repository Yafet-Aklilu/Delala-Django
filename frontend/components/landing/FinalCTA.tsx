"use client";

import Image from "next/image";
import Link from "next/link";
import type { AuthUser } from "@/lib/auth-types";

const CTA_IMAGE =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2200&q=80";

type Props = {
  user?: AuthUser | null;
};

export default function FinalCTA({ user = null }: Props) {
  const role = user?.user_type;

  return (
    <section className="relative overflow-hidden border-t border-line">
      <div className="absolute inset-0">
        <Image
          src={CTA_IMAGE}
          alt="Architectural exterior at dusk"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-bg/80" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(8,8,8,0.92)_0%,rgba(8,8,8,0.55)_55%,rgba(8,8,8,0.75)_100%)]" />
      </div>

      <div className="section-pad relative py-28 md:py-40">
        <div className="mx-auto max-w-7xl">
          <h2 className="display reveal-item max-w-[14ch] text-[clamp(2.8rem,7vw,6rem)] text-ink">
            Your next place is closer than you think.
          </h2>
          <div className="reveal-item mt-12 flex flex-col gap-3 sm:flex-row">
            {role === "owner" ? (
              <>
                <Link href="/owner" className="btn btn-primary">
                  View Dashboard
                </Link>
                <Link href="/owner/list-property" className="btn btn-ghost">
                  List a Property
                </Link>
              </>
            ) : role === "customer" ? (
              <>
                <Link href="/customer/explore" className="btn btn-primary">
                  Explore Properties
                </Link>
                <Link href="/customer/requests" className="btn btn-ghost">
                  My Requests
                </Link>
              </>
            ) : (
              <>
                <Link href="#explore" className="btn btn-primary">
                  Explore Properties
                </Link>
                <Link href="/list" className="btn btn-ghost">
                  List Your Property
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
