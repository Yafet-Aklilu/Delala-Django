import Link from "next/link";

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function AuthShell({ title, subtitle, children }: Props) {
  return (
    <main className="auth-shell section-pad flex min-h-screen flex-col justify-center py-16">
      <div className="mx-auto w-full max-w-6xl">
        <Link href="/" className="inline-flex items-baseline gap-2">
          <span className="display text-3xl text-ink">Delala</span>
          <span lang="am" className="text-accent">
            ደላላ
          </span>
        </Link>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <h1 className="display text-[clamp(2.4rem,5vw,3.75rem)] text-ink">
              {title}
            </h1>
            <p className="mt-4 max-w-sm text-base font-light leading-relaxed text-ink-soft">
              {subtitle}
            </p>
          </div>
          <div className="auth-panel border border-line bg-bg-raised p-6 sm:p-8 lg:col-span-6 lg:col-start-7">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
