"use client";

import type { Property } from "@/lib/types";
import { useAuthSession } from "@/lib/useAuthSession";
import MarketingLanding from "@/components/home/MarketingLanding";

export default function HomeGate({
  featuredProperties,
}: {
  featuredProperties: Property[];
}) {
  const { status, user } = useAuthSession();

  // Avoid flashing the wrong nav/CTAs while the session is resolving.
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <p className="display text-3xl text-ink">Delala</p>
          <p lang="am" className="mt-2 text-accent">
            ደላላ
          </p>
        </div>
      </div>
    );
  }

  // One shared landing page for everyone — adapts via user prop.
  return (
    <MarketingLanding properties={featuredProperties} user={user} />
  );
}
