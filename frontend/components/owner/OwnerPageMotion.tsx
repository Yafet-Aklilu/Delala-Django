"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

export default function OwnerPageMotion({
  children,
}: {
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) return;

      const items = gsap.utils.toArray<HTMLElement>(".reveal-item");
      gsap.from(items, {
        autoAlpha: 0,
        y: 22,
        duration: 0.75,
        stagger: 0.07,
        ease: "power3.out",
      });
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
