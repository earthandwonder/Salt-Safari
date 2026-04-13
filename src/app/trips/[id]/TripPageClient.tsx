"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WaveDivider } from "@/components/WaveDivider";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import type { TripData } from "./page";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function TripPageClient({ trip }: { trip: TripData }) {
  const [toastVisible, setToastVisible] = useState(false);
  const speciesCount = trip.sightings.length;
  const progressPct =
    trip.totalSpeciesAtLocation > 0
      ? Math.round((speciesCount / trip.totalSpeciesAtLocation) * 100)
      : 0;

  const locationHref = `/locations/${trip.regionSlug}/${trip.locationSlug}`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `${trip.displayName} saw ${speciesCount} species at ${trip.locationName}`,
      text: `Check out this trip report — ${speciesCount} species spotted at ${trip.locationName}!`,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2000);
    }
  }, [shareUrl, speciesCount, trip.displayName, trip.locationName]);

  return (
    <div className="min-h-screen bg-sand">
      <Header />

      {/* ══════════════════════════════════════════
          HERO — celebratory, editorial
         ══════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 hero-gradient">
          <div className="caustic-overlay" />
        </div>

        {/* Faint species photo mosaic behind hero text */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <div className="absolute inset-0 flex flex-wrap gap-0 overflow-hidden">
            {trip.sightings.slice(0, 12).map((s, i) =>
              s.heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s.id}
                  src={s.heroImageUrl}
                  alt=""
                  className="w-1/4 h-1/3 object-cover"
                  style={{ opacity: 0.6 + (i % 3) * 0.15 }}
                  loading="eager"
                />
              ) : null,
            )}
          </div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-28 pb-16 md:pt-36 md:pb-20 text-center">
          {/* Species count — large numeral */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-coral to-teal-500 shadow-lg shadow-coral/20 mb-5"
          >
            <span className="font-display text-2xl md:text-3xl font-bold text-white">
              {speciesCount}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-tight"
          >
            {trip.displayName} saw{" "}
            <span className="text-coral">{speciesCount} species</span> at{" "}
            {trip.locationName}
          </motion.h1>

          {/* Date */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-white/50 text-sm mt-3"
          >
            {formatDate(trip.date)}
          </motion.p>

          {/* Progress bar */}
          {trip.totalSpeciesAtLocation > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-8 max-w-md mx-auto"
            >
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <span>
                  {speciesCount} of {trip.totalSpeciesAtLocation} species at{" "}
                  {trip.locationName}
                </span>
                <span className="font-medium text-white/80">{progressPct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-coral via-teal-400 to-emerald-400"
                />
              </div>
            </motion.div>
          )}

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-8"
          >
            <Link
              href={locationHref}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-coral hover:bg-coral-dark text-white text-sm font-semibold transition-colors shadow-md shadow-coral/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Discover {trip.locationName}
            </Link>
            <Link
              href="/id"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/30 text-white/90 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              What did you see?
            </Link>

            {/* Desktop share button */}
            <button
              onClick={handleShare}
              className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share trip
            </button>
          </motion.div>
        </div>

        <WaveDivider fill="#FFFBF5" />
      </section>

      {/* ══════════════════════════════════════════
          SPECIES GRID
         ══════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
        {trip.username && (
          <div className="mb-8 flex items-center gap-3">
            <Link
              href={`/u/${trip.username}`}
              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              View {trip.displayName}&apos;s profile
            </Link>
          </div>
        )}

        <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }}>
          {trip.sightings.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.8) }}
            >
              <SightingCard sighting={s} />
            </motion.div>
          ))}
        </ResponsiveGrid>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE SHARE FAB
         ══════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-coral hover:bg-coral-dark text-white text-sm font-semibold shadow-lg shadow-coral/30 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>

      {/* ══════════════════════════════════════════
          TOAST
         ══════════════════════════════════════════ */}
      {toastVisible && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-5 py-2.5 rounded-full bg-deep text-white text-sm font-medium shadow-xl"
          >
            Link copied!
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
}

// ─── Sighting Card ─────────────────────────────────────────────────
function SightingCard({
  sighting,
}: {
  sighting: {
    id: string;
    speciesName: string;
    scientificName: string | null;
    speciesSlug: string;
    heroImageUrl: string | null;
    quantity: number;
    notes: string | null;
  };
}) {
  return (
    <Link
      href={`/species/${sighting.speciesSlug}`}
      className="group block rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100 card-lift"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {sighting.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sighting.heroImageUrl}
            alt={sighting.speciesName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full photo-placeholder-species" />
        )}

        {/* Quantity badge */}
        {sighting.quantity > 1 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-deep/80 backdrop-blur-sm text-white text-xs font-bold">
            {sighting.quantity}x
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Card body */}
      <div className="p-3 md:p-4">
        <h3 className="font-display text-sm md:text-base font-semibold text-deep leading-tight truncate">
          {sighting.speciesName}
        </h3>
        {sighting.scientificName && (
          <p className="text-xs text-slate-400 italic mt-0.5 truncate">
            {sighting.scientificName}
          </p>
        )}
        {sighting.notes && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
            &ldquo;{sighting.notes}&rdquo;
          </p>
        )}
      </div>
    </Link>
  );
}
