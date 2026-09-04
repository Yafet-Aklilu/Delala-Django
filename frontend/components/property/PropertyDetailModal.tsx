"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Property } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { createPropertyRequest } from "@/lib/api";

gsap.registerPlugin(useGSAP);

const FALLBACK =
  "/camden-paces-apartments-buckhead-ga-terraces-living-room-with-den_1.jpg";

type RequestUiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "sent" }
  | { kind: "exists" }
  | { kind: "error"; message: string };

type Props = {
  property: Property | null;
  open: boolean;
  onClose: () => void;
  onRequestCreated?: () => void;
};

function imageUrls(property: Property): string[] {
  const urls = property.images
    .map((img) => img.url)
    .filter((url): url is string => Boolean(url));
  return urls.length > 0 ? urls : [FALLBACK];
}

export default function PropertyDetailModal({
  property,
  open,
  onClose,
  onRequestCreated,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const primaryImageRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const scrollYRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [requestState, setRequestState] = useState<RequestUiState>({
    kind: "idle",
  });

  const urls = property ? imageUrls(property) : [];
  const hasGallery = urls.length > 1;
  const activeUrl = urls[activeIndex] ?? FALLBACK;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !property) {
      setVisible(false);
      return;
    }
    setActiveIndex(0);
    setRequestState({ kind: "idle" });
    setVisible(true);
  }, [open, property]);

  // Lock background scroll while open; restore exact scroll position on close.
  useEffect(() => {
    if (!visible) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    scrollYRef.current = window.scrollY;
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevWidth = body.style.width;
    const prevHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.width = "100%";
    documentElement.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 40);

    return () => {
      window.clearTimeout(focusTimer);
      body.style.overflow = prevOverflow;
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.width = prevWidth;
      documentElement.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollYRef.current);
      previousFocusRef.current?.focus?.();
    };
  }, [visible]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, handleClose]);

  useGSAP(
    () => {
      if (!visible || !backdropRef.current || !panelRef.current) return;

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduce) {
        gsap.set(backdropRef.current, { autoAlpha: 1 });
        gsap.set(panelRef.current, { autoAlpha: 1, y: 0, scale: 1 });
        if (primaryImageRef.current) {
          gsap.set(primaryImageRef.current, { autoAlpha: 1, scale: 1 });
        }
        if (infoRef.current) {
          gsap.set(infoRef.current.children, { autoAlpha: 1, y: 0 });
        }
        return;
      }

      gsap.set(backdropRef.current, { autoAlpha: 0 });
      gsap.set(panelRef.current, { autoAlpha: 0, y: 28, scale: 0.985 });
      if (primaryImageRef.current) {
        gsap.set(primaryImageRef.current, { autoAlpha: 0, scale: 1.04 });
      }
      if (infoRef.current) {
        gsap.set(infoRef.current.children, { autoAlpha: 0, y: 14 });
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(backdropRef.current, { autoAlpha: 1, duration: 0.35 }, 0)
        .to(
          panelRef.current,
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 },
          0.05,
        )
        .to(
          primaryImageRef.current,
          { autoAlpha: 1, scale: 1, duration: 0.55 },
          0.12,
        )
        .to(
          infoRef.current?.children ?? [],
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 },
          0.2,
        );
    },
    { dependencies: [visible, property?.id] },
  );

  const goTo = useCallback(
    (index: number) => {
      if (urls.length === 0) return;
      const next = ((index % urls.length) + urls.length) % urls.length;
      setActiveIndex(next);

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce || !primaryImageRef.current) return;

      gsap.fromTo(
        primaryImageRef.current,
        { autoAlpha: 0.55, scale: 1.02 },
        { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power2.out" },
      );
    },
    [urls.length],
  );

  const handleRequest = useCallback(async () => {
    if (!property || requestState.kind === "loading") return;
    setRequestState({ kind: "loading" });
    const result = await createPropertyRequest(property.id);
    if (!result.ok) {
      setRequestState({ kind: "error", message: result.error });
      return;
    }
    setRequestState({
      kind: result.alreadyExists ? "exists" : "sent",
    });
    onRequestCreated?.();
  }, [property, requestState.kind, onRequestCreated]);

  if (!mounted || !visible || !property) return null;

  return createPortal(
    <div className="property-modal" role="presentation">
      <div
        ref={backdropRef}
        className="property-modal__backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className="property-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="property-modal__close"
          onClick={handleClose}
          aria-label="Close property details"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="property-modal__layout">
          <div className="property-modal__gallery">
            <div ref={primaryImageRef} className="property-modal__primary">
              <Image
                key={activeUrl}
                src={activeUrl}
                alt={property.title}
                fill
                className="object-cover"
                sizes="(max-width: 900px) 100vw, 58vw"
                priority
              />
              {hasGallery ? (
                <div className="property-modal__count" aria-live="polite">
                  {activeIndex + 1} / {urls.length}
                </div>
              ) : null}
              {hasGallery ? (
                <>
                  <button
                    type="button"
                    className="property-modal__nav property-modal__nav--prev"
                    onClick={() => goTo(activeIndex - 1)}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="property-modal__nav property-modal__nav--next"
                    onClick={() => goTo(activeIndex + 1)}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>

            {hasGallery ? (
              <div
                className="property-modal__thumbs"
                role="tablist"
                aria-label="Property photos"
              >
                {urls.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-label={`Show photo ${index + 1}`}
                    className={`property-modal__thumb${
                      index === activeIndex
                        ? " property-modal__thumb--active"
                        : ""
                    }`}
                    onClick={() => goTo(index)}
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div ref={infoRef} className="property-modal__info">
            <div>
              <p className="eyebrow text-accent">Property</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                <span className="eyebrow">{property.status_display}</span>
                <span className="eyebrow">{property.property_type_display}</span>
              </div>
            </div>

            <h2
              id={titleId}
              className="display mt-4 text-[clamp(1.85rem,3.5vw,2.75rem)] text-ink"
            >
              {property.title}
            </h2>

            <p className="mt-4 text-sm font-light text-ink-soft">
              {property.location}
            </p>

            <p className="mt-5 text-2xl font-medium tracking-tight text-ink md:text-3xl">
              {formatPrice(property.price, property.status)}
            </p>

            <div className="mt-8 border-t border-line pt-6">
              <p className="eyebrow">About this place</p>
              <p
                id={descId}
                className="mt-3 text-sm font-light leading-relaxed text-ink-soft whitespace-pre-wrap"
              >
                {property.description?.trim()
                  ? property.description
                  : "No description provided for this listing."}
              </p>
            </div>

            <div className="property-modal__actions mt-10 flex flex-col gap-3">
              {requestState.kind === "sent" || requestState.kind === "exists" ? (
                <div className="property-modal__confirm border border-line bg-bg-raised px-4 py-5">
                  <p className="eyebrow text-accent">
                    {requestState.kind === "exists"
                      ? "Request already sent"
                      : "Request sent"}
                  </p>
                  <p className="mt-3 text-sm font-light leading-relaxed text-ink-soft">
                    {requestState.kind === "exists"
                      ? "You've already requested this property."
                      : "Your request has been sent to the owner. You'll be notified when they respond."}
                  </p>
                </div>
              ) : (
                <>
                  {requestState.kind === "error" ? (
                    <p className="form-error" role="alert">
                      {requestState.message}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    disabled={requestState.kind === "loading"}
                    onClick={() => void handleRequest()}
                  >
                    {requestState.kind === "loading"
                      ? "Sending…"
                      : "Request Property"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
