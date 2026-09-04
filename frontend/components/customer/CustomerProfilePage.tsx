"use client";

import OwnerPageMotion from "@/components/owner/OwnerPageMotion";
import { useCustomer } from "@/components/customer/CustomerProvider";

export default function CustomerProfilePage() {
  const { user, signOut } = useCustomer();

  return (
    <OwnerPageMotion>
      <header className="reveal-item border-b border-line pb-8">
        <p className="eyebrow text-accent">Profile</p>
        <h1 className="display mt-3 text-[clamp(2.1rem,4.5vw,3.25rem)] text-ink">
          Your account
        </h1>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-ink-soft">
          Details from your Delala customer profile. Editing will be added when
          the account API supports it.
        </p>
      </header>

      <div className="reveal-item mt-8 border border-line bg-bg-raised">
        <dl className="divide-y divide-line">
          {[
            {
              label: "Name",
              value:
                [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                "—",
            },
            { label: "Username", value: user.username },
            { label: "Email", value: user.email },
            { label: "Phone", value: user.phone_no || "—" },
            { label: "Account type", value: "Customer" },
          ].map((row) => (
            <div
              key={row.label}
              className="grid gap-1 px-5 py-5 sm:grid-cols-3 sm:gap-4 sm:px-6"
            >
              <dt className="text-xs uppercase tracking-[0.16em] text-ink-muted">
                {row.label}
              </dt>
              <dd className="text-base text-ink sm:col-span-2">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="reveal-item mt-8">
        <button
          type="button"
          onClick={() => void signOut()}
          className="btn btn-ghost"
        >
          Log out
        </button>
      </div>
    </OwnerPageMotion>
  );
}
