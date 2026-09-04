import Link from "next/link";

type Props = {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export default function OwnerEmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: Props) {
  return (
    <div className="reveal-item border border-line bg-bg-raised px-6 py-14 text-center sm:px-10">
      <p className="eyebrow text-accent">Nothing here yet</p>
      <h3 className="display mx-auto mt-4 max-w-md text-3xl text-ink sm:text-4xl">
        {title}
      </h3>
      <p className="mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-ink-soft sm:text-base">
        {description}
      </p>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="btn btn-primary mt-8 inline-flex">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
