"use client";

type Props = {
  count: number;
  className?: string;
};

function formatLabel(count: number): string {
  if (count <= 0) return "";
  return String(count);
}

/** Small top-right unread badge for Messages nav / FAB. Hidden when count is 0. */
export default function UnreadMessageBadge({ count, className = "" }: Props) {
  if (count <= 0) return null;
  return (
    <span className={`messages-nav-badge ${className}`.trim()} aria-hidden="true">
      {formatLabel(count)}
    </span>
  );
}
