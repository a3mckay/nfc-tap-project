"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Slide = {
  type: "image";
  url: string;
  alt: string;
} | {
  type: "video";
  embedUrl: string;
  thumbnailUrl?: string;
}

interface Props {
  slides: Slide[];
  primaryColor: string;
}

export function MediaGallery({ slides, primaryColor }: Props) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  if (slides.length === 0) return null;

  // Close lightbox on Escape
  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // Lock body scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = lightbox !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    setCurrent(clamped);
    trackRef.current?.scrollTo({ left: clamped * trackRef.current.offsetWidth, behavior: "smooth" });
  }

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0]!.clientX;
    isDraggingRef.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return;
    if (Math.abs(e.touches[0]!.clientX - startXRef.current) > 5) isDraggingRef.current = true;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (startXRef.current === null) return;
    const dx = e.changedTouches[0]!.clientX - startXRef.current;
    if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    startXRef.current = null;
  }

  function onScroll() {
    if (!trackRef.current) return;
    const idx = Math.round(trackRef.current.scrollLeft / trackRef.current.offsetWidth);
    if (idx !== current) setCurrent(idx);
  }

  const lightboxSlide = lightbox !== null ? slides[lightbox] : null;

  return (
    <>
      {/* ── Carousel ── */}
      <div style={{ position: "relative", width: "100%", background: "#111", userSelect: "none" }}>
        {/* Track */}
        <div
          ref={trackRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onScroll={onScroll}
          style={{
            display: "flex",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: "100%",
                aspectRatio: "4/5",
                scrollSnapAlign: "start",
                position: "relative",
                background: "#111",
                cursor: slide.type === "image" ? "zoom-in" : "default",
                overflow: "hidden",
              }}
              onClick={() => {
                if (!isDraggingRef.current && slide.type === "image") setLightbox(i);
              }}
            >
              {slide.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.url}
                  alt={slide.alt}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  draggable={false}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", position: "relative" }}>
                  <iframe
                    src={slide.embedUrl}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Product video"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Slide counter — top right */}
        {slides.length > 1 && (
          <div style={{
            position: "absolute", top: "0.75rem", right: "0.75rem",
            background: "rgba(0,0,0,0.45)", color: "#fff",
            fontSize: "0.72rem", fontWeight: 600,
            padding: "2px 8px", borderRadius: "9999px",
            backdropFilter: "blur(4px)",
          }}>
            {current + 1} / {slides.length}
          </div>
        )}

        {/* Prev / Next arrows (desktop) */}
        {slides.length > 1 && current > 0 && (
          <button
            onClick={() => goTo(current - 1)}
            style={{
              position: "absolute", left: "0.5rem", top: "50%", transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.4)", color: "#fff", border: "none",
              borderRadius: "50%", width: "36px", height: "36px",
              cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Previous"
          >‹</button>
        )}
        {slides.length > 1 && current < slides.length - 1 && (
          <button
            onClick={() => goTo(current + 1)}
            style={{
              position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.4)", color: "#fff", border: "none",
              borderRadius: "50%", width: "36px", height: "36px",
              cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Next"
          >›</button>
        )}
      </div>

      {/* ── Dot indicators ── */}
      {slides.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "5px", padding: "8px 0", background: "#111" }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === current ? "18px" : "6px",
                height: "6px",
                borderRadius: "9999px",
                background: i === current ? primaryColor : "rgba(255,255,255,0.35)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "width 0.2s ease, background 0.2s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxSlide && lightboxSlide.type === "image" && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute", top: "1rem", right: "1rem",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              border: "none", borderRadius: "50%",
              width: "40px", height: "40px",
              fontSize: "1.25rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Close"
          >✕</button>

          {/* Prev in lightbox */}
          {lightbox! > 0 && slides[lightbox! - 1]?.type === "image" && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox! - 1); goTo(lightbox! - 1); }}
              style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "50%", width: "40px", height: "40px", fontSize: "1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >‹</button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSlide.url}
            alt={lightboxSlide.alt}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px" }}
          />

          {/* Next in lightbox */}
          {lightbox! < slides.length - 1 && slides[lightbox! + 1]?.type === "image" && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox! + 1); goTo(lightbox! + 1); }}
              style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "50%", width: "40px", height: "40px", fontSize: "1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >›</button>
          )}
        </div>
      )}
    </>
  );
}
