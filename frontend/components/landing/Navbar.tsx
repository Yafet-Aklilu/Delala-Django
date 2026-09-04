"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth-types";
import { logout } from "@/lib/auth";

const visitorLinks = [
  { href: "#explore", label: "Explore" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#owners", label: "For Owners" },
];

type Props = {
  user?: AuthUser | null;
};

export default function Navbar({ user = null }: Props) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function onLogout() {
    setOpen(false);
    await logout();
    // Auth session clears via emitAuthChange; stay on / with visitor UI.
    router.replace("/");
  }

  const role = user?.user_type;
  const customerLinks = [
    { href: "/", label: "Home" },
    { href: "/customer/explore", label: "Explore" },
    { href: "/customer/requests", label: "My Requests" },
    { href: "/customer", label: "Dashboard" },
  ];
  const ownerLinks = [
    { href: "/", label: "Home" },
    { href: "/owner", label: "Dashboard" },
    { href: "/owner/properties", label: "My Properties" },
    { href: "/owner/requests", label: "Requests" },
  ];

  const midLinks =
    role === "customer"
      ? customerLinks
      : role === "owner"
        ? ownerLinks
        : visitorLinks;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled || open
          ? "border-b border-line bg-bg/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="section-pad flex h-[4.25rem] items-center justify-between lg:h-[5rem]">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="display text-[1.85rem] leading-none tracking-tight text-ink">
            Delala
          </span>
        </Link>

        <div className="hidden items-center gap-10 lg:flex">
          {midLinks.map((link) =>
            link.href.startsWith("#") ? (
              <a key={link.href} href={link.href} className="nav-link">
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ),
          )}
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          {!user ? (
            <>
              <Link href="/login" className="nav-link">
                Log in
              </Link>
              <Link href="/list" className="btn btn-primary">
                List a Property
              </Link>
            </>
          ) : role === "owner" ? (
            <>
              <button type="button" onClick={() => void onLogout()} className="nav-link">
                Log out
              </button>
              <Link href="/owner/list-property" className="btn btn-primary">
                List a Property
              </Link>
            </>
          ) : (
            <>
              <Link href="/customer/profile" className="nav-link">
                Profile
              </Link>
              <button type="button" onClick={() => void onLogout()} className="nav-link">
                Log out
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-10 w-10 items-center justify-center lg:hidden"
        >
          <span
            className={`absolute h-px w-5 bg-ink transition-transform duration-300 ${
              open ? "rotate-45" : "-translate-y-1.5"
            }`}
          />
          <span
            className={`absolute h-px w-5 bg-ink transition-opacity duration-300 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute h-px w-5 bg-ink transition-transform duration-300 ${
              open ? "-rotate-45" : "translate-y-1.5"
            }`}
          />
        </button>
      </nav>

      <div
        className={`section-pad overflow-hidden border-t border-line bg-bg transition-[max-height,opacity] duration-500 lg:hidden ${
          open ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-6 py-8">
          {midLinks.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="display text-3xl text-ink"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="display text-3xl text-ink"
              >
                {link.label}
              </Link>
            ),
          )}
          <hr className="rule" />
          {!user ? (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="nav-link w-fit"
              >
                Log in
              </Link>
              <Link
                href="/list"
                onClick={() => setOpen(false)}
                className="btn btn-primary w-fit"
              >
                List a Property
              </Link>
            </>
          ) : (
            <>
              {role === "owner" ? (
                <Link
                  href="/owner/list-property"
                  onClick={() => setOpen(false)}
                  className="btn btn-primary w-fit"
                >
                  List a Property
                </Link>
              ) : (
                <Link
                  href="/customer/profile"
                  onClick={() => setOpen(false)}
                  className="nav-link w-fit"
                >
                  Profile
                </Link>
              )}
              <button
                type="button"
                onClick={() => void onLogout()}
                className="nav-link w-fit text-left"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
