import Link from "next/link";

type Props = {
  title: string;
  description: string;
};

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <main className="section-pad flex min-h-screen flex-col justify-center bg-bg py-24">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="display text-2xl text-ink">
          Delala
        </Link>
        <p className="eyebrow mt-16 text-accent">Coming next</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,6vw,4.5rem)] text-ink">
          {title}
        </h1>
        <p className="mt-6 max-w-md text-base font-light leading-relaxed text-ink-soft">
          {description}
        </p>
        <Link href="/" className="btn btn-ghost mt-10 w-fit">
          Back to home
        </Link>
      </div>
    </main>
  );
}
