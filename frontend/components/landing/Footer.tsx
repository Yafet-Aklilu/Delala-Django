import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-bg">
      <div className="section-pad py-16 md:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" className="display text-3xl text-ink">
              Delala
            </Link>
            <p className="mt-4 max-w-xs text-sm font-light leading-relaxed text-ink-muted">
              Property without the traditional middleman. Built for Ethiopia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-16">
            <div className="flex flex-col gap-3">
              <p className="eyebrow mb-2">Explore</p>
              <a href="#explore" className="text-sm text-ink-soft hover:text-ink">
                Properties
              </a>
              <a href="#how-it-works" className="text-sm text-ink-soft hover:text-ink">
                How it works
              </a>
              <a href="#about" className="text-sm text-ink-soft hover:text-ink">
                About
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="eyebrow mb-2">Owners</p>
              <Link href="/list" className="text-sm text-ink-soft hover:text-ink">
                List Property
              </Link>
              <a href="#owners" className="text-sm text-ink-soft hover:text-ink">
                For Owners
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="eyebrow mb-2">Account</p>
              <Link href="/login" className="text-sm text-ink-soft hover:text-ink">
                Log in
              </Link>
              <Link href="/signup" className="text-sm text-ink-soft hover:text-ink">
                Sign up
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-3 border-t border-line pt-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Delala. All rights reserved.</p>
          <p lang="am" className="text-ink-soft">
            ደላላ
          </p>
        </div>
      </div>
    </footer>
  );
}
