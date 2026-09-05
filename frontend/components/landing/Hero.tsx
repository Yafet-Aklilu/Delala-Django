"use client";

import Image from "next/image";
import Link from "next/link";
import type { AuthUser } from "@/lib/auth-types";
import { displayFirstName, greetingForNow } from "@/lib/greeting";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1728722104881-773da8f4b7ea?q=80&w=3264&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

type Props = {
  user?: AuthUser | null;
};

export default function Hero({ user = null }: Props) {
  const role = user?.user_type;
  const name = user ? displayFirstName(user) : null;

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt="Modern residence at dusk"
          fill
          priority
          className="hero-image object-cover object-[center_35%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(8,8,8,0.95)_0%,rgba(8,8,8,0.82)_34%,rgba(8,8,8,0.38)_70%,rgba(8,8,8,0.62)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,8,8,0.88)_0%,transparent_45%)]" />
      </div>

      <div className="section-pad relative flex min-h-[100svh] flex-col justify-end pb-14 pt-28 md:justify-center md:pb-24 md:pt-32">
        <div className="max-w-4xl">
          <div className="hero-brand overflow-hidden">
            <h1
              lang="am"
              className="hero-brand-line hero-brand-line-amharic text-[clamp(9rem,36vw,22rem)] leading-[0.82] tracking-[-0.04em] text-ink"
            >
              ደላላ
            </h1>
          </div>
          {name ? (
            <p className="hero-copy mt-3 text-sm font-light tracking-wide text-ink-soft md:mt-4 md:text-base">
              {greetingForNow()}, {name}.
            </p>
          ) : null}

          <h2 className="hero-title display mt-3 max-w-[14ch] text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.02] text-ink-soft md:mt-4">
            <span className="block overflow-hidden">
              <span className="hero-line block">Find a place.</span>
            </span>
            <span className="mt-1 block overflow-hidden italic">
              <span className="hero-line block">Without the middleman.</span>
            </span>
          </h2>

          <p className="hero-copy mt-7 max-w-md text-[1.02rem] font-light leading-relaxed text-ink-soft md:mt-8 md:text-lg">
            {role === "owner"
              ? "Manage your listings and connect with people looking, directly on Delala."
              : role === "customer"
                ? "Browse places and reach owners directly, without the traditional middleman."
                : "Connect with property owners in Ethiopia directly."}
          </p>

          <div className="hero-ctas mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
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
                <Link href="/customer" className="btn btn-ghost">
                  Open Dashboard
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

        <div className="hero-scroll mt-14 flex items-center gap-4 text-ink-muted md:mt-20">
          <span className="h-px w-10 bg-line-strong" />
          <span className="eyebrow">Scroll</span>
        </div>
      </div>
    </section>
  );
}
