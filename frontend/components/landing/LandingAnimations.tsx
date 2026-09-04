"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function LandingAnimations({
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

      const heroLines = gsap.utils.toArray<HTMLElement>(".hero-line");
      const heroBits = gsap.utils.toArray<HTMLElement>([
        ".hero-amharic",
        ".hero-copy",
        ".hero-ctas",
        ".hero-scroll",
      ]);

      gsap.set(".hero-brand-line", { yPercent: 110 });
      gsap.set(heroLines, { yPercent: 110 });
      gsap.set(heroBits, { autoAlpha: 0, y: 18 });
      gsap.set(".hero-image", { scale: 1.08 });

      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl
        .to(".hero-image", { scale: 1, duration: 2.2 }, 0)
        .to(".hero-brand-line", { yPercent: 0, duration: 1.25 }, 0.15)
        .to(heroLines, { yPercent: 0, duration: 1.1, stagger: 0.1 }, 0.35)
        .to(
          heroBits,
          { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 },
          0.55,
        );

      gsap.utils.toArray<HTMLElement>(".reveal-item").forEach((el) => {
        gsap.from(el, {
          autoAlpha: 0,
          y: 36,
          duration: 1.05,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
