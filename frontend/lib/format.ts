import { API_BASE } from "./config";

export function formatPrice(price: string | number, status?: string): string {
  const value = typeof price === "string" ? Number(price) : price;
  if (Number.isNaN(value)) return String(price);

  const formatted = new Intl.NumberFormat("en-ET", {
    maximumFractionDigits: 0,
  }).format(value);

  const suffix = status === "rent" ? "/mo" : "";
  return `ETB ${formatted}${suffix}`;
}

export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

export function formatRequestDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
