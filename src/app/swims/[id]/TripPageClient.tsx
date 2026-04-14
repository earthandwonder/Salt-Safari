"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WaveDivider } from "@/components/WaveDivider";
import { LikelihoodPill } from "@/components/LikelihoodPill";
import { SpotterTierBadge } from "@/components/SpotterTierBadge";
import { getSpotterTier } from "@/lib/spotter-tiers";
import type { TripData } from "./page";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString("en-AU", { weekday: "long" });
  }

  const day = date.getDate();
  const ordinal =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const weekday = date.toLocaleDateString("en-AU", { weekday: "long" });
  const month = date.toLocaleDateString("en-AU", { month: "long" });
  const year = `'${String(date.getFullYear()).slice(2)}`;

  return `${weekday}, ${day}${ordinal} ${month} ${year}`;
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
      text: `Check out this swim report — ${speciesCount} species spotted at ${trip.locationName}!`,
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
                <Image
                  key={s.id}
                  src={s.heroImageUrl}
                  alt=""
                  width={400}
                  height={300}
                  className="w-1/4 h-1/3 object-cover"
                  style={{ opacity: 0.6 + (i % 3) * 0.15 }}
                  priority
                />
              ) : null,
            )}
          </div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-28 pb-16 md:pt-36 md:pb-20 text-center">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-tight"
          >
            {trip.displayName} saw{" "}
            <span className="text-coral">{speciesCount} species</span>
          </motion.h1>

          {/* Location link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Link
              href={locationHref}
              className="inline-flex items-center gap-1.5 mt-2 text-white/60 hover:text-white transition-colors group/loc"
            >
              <span className="font-display text-xl md:text-2xl lg:text-3xl font-medium">
                at {trip.locationName}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="opacity-100 md:opacity-0 md:-translate-x-1 md:group-hover/loc:opacity-100 md:group-hover/loc:translate-x-0 transition-all duration-200"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </motion.div>

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
                  {trip.displayName} has found {speciesCount} of {trip.totalSpeciesAtLocation} spottable species
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

          {/* Spotter tier */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="mt-4 flex justify-center"
          >
            <SpotterTierBadge tier={getSpotterTier(trip.totalUserSpecies)} variant="dark" />
          </motion.div>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-8"
          >
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
              Share swim
            </button>
          </motion.div>
        </div>

        <WaveDivider fill="#FFFBF5" />
      </section>

      {/* ══════════════════════════════════════════
          SPECIES GRID
         ══════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          {trip.username && (
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
          )}
          <Link
            href={`/locations/${trip.regionSlug}/${trip.locationSlug}/community/${trip.date}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            See what everyone saw
          </Link>
        </div>

        <div className="space-y-4">
          {trip.sightings.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.7) }}
            >
              <SightingRow sighting={s} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE SHARE FAB
         ══════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-24 right-5 z-[110]">
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
          Share With Your Swim Group
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

// ─── Sighting Row ─────────────────────────────────────────────────
function SightingRow({
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
    likelihood: "common" | "occasional" | "rare" | null;
  };
}) {
  return (
    <Link
      href={`/species/${sighting.speciesSlug}`}
      className="group/row block rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
    >
      {/* Mobile/tablet: stacked — Desktop: side-by-side */}
      <div className="lg:flex">
        {/* Image — full-width on mobile, fixed width on desktop */}
        <div className="relative aspect-[16/10] lg:aspect-auto lg:w-72 lg:shrink-0 overflow-hidden">
          {sighting.heroImageUrl ? (
            <Image
              src={sighting.heroImageUrl}
              alt={sighting.speciesName}
              fill
              sizes="(max-width: 1024px) 100vw, 288px"
              className="object-cover transition-transform duration-500 group-hover/row:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full photo-placeholder-species" />
          )}

          {/* Quantity badge */}
          {sighting.quantity > 1 && (
            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-sm">
              {sighting.quantity}&times; spotted
            </span>
          )}

          {/* Bottom gradient for text readability on mobile */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent lg:hidden" />
        </div>

        {/* Details */}
        <div className="p-4 md:p-5 lg:p-6 lg:flex-1 lg:flex lg:flex-col lg:justify-center min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg md:text-xl font-semibold text-deep group-hover/row:text-teal-700 transition-colors leading-tight">
                {sighting.speciesName}
              </h3>
              {sighting.scientificName && (
                <p className="text-sm text-slate-400 italic mt-0.5 truncate">
                  {sighting.scientificName}
                </p>
              )}
            </div>
            {sighting.likelihood && (
              <div className="shrink-0 mt-0.5">
                <LikelihoodPill likelihood={sighting.likelihood} />
              </div>
            )}
          </div>

          {sighting.notes && (
            <p className="text-sm text-slate-500 mt-3 leading-relaxed line-clamp-3">
              &ldquo;{sighting.notes}&rdquo;
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
