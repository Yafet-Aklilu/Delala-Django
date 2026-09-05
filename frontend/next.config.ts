import type { NextConfig } from "next";

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
};

const localMediaPatterns: RemotePattern[] = [
  {
    protocol: "http",
    hostname: "127.0.0.1",
    port: "8000",
    pathname: "/media/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "8000",
    pathname: "/media/**",
  },
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    pathname: "/**",
  },
];

function patternsFromUrl(raw: string | undefined): RemotePattern[] {
  if (!raw?.trim()) return [];
  try {
    const url = new URL(raw.trim());
    const protocol = url.protocol === "http:" ? "http" : "https";
    const pattern: RemotePattern = {
      protocol,
      hostname: url.hostname,
      pathname: "/**",
    };
    if (url.port) pattern.port = url.port;
    return [pattern];
  } catch {
    return [];
  }
}

function patternsFromHostList(raw: string | undefined): RemotePattern[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((hostname) => ({
      protocol: "https" as const,
      hostname,
      pathname: "/**",
    }));
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...localMediaPatterns,
      // Production API host (property images may still be under /media on the API).
      ...patternsFromUrl(process.env.NEXT_PUBLIC_API_URL),
      // Cloudflare R2 / CDN public base for uploaded property media.
      ...patternsFromUrl(process.env.NEXT_PUBLIC_MEDIA_URL),
      ...patternsFromHostList(process.env.NEXT_PUBLIC_IMAGE_HOSTS),
    ],
  },
};

export default nextConfig;
