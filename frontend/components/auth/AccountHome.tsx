"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth-types";

type Props = {
  expectedType: "owner" | "customer";
  title: string;
  description: string;
};

export default function AccountHome({ expectedType, title, description }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const current = await getCurrentUser();
      if (!active) return;

      if (!current || current.user_type !== expectedType) {
        router.replace("/login");
        return;
      }

      setUser(current);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [expectedType, router]);

  async function onLogout() {
    await logout();
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="section-pad flex min-h-screen items-center bg-bg">
        <p className="text-ink-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="section-pad flex min-h-screen flex-col justify-center bg-bg py-24">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="display text-2xl text-ink">
          Delala
        </Link>
        <p className="eyebrow mt-16 text-accent">
          {expectedType === "owner" ? "Owner" : "Customer"}
        </p>
        <h1 className="display mt-4 text-[clamp(2.4rem,5vw,4rem)] text-ink">
          {title}
        </h1>
        <p className="mt-5 max-w-md text-base font-light leading-relaxed text-ink-soft">
          {description}
        </p>
        {user ? (
          <p className="mt-6 text-sm text-ink-muted">
            Signed in as {user.first_name || user.username} ({user.email})
          </p>
        ) : null}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn btn-ghost w-fit">
            Back to home
          </Link>
          <button type="button" onClick={onLogout} className="btn btn-primary w-fit">
            Log out
          </button>
        </div>
      </div>
    </main>
  );
}
