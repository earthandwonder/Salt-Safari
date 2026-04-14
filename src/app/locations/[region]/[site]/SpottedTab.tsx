"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { SpeciesCard } from "@/components/SpeciesCard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import type { Likelihood } from "@/components/LikelihoodPill";
import type { LocationSpeciesWithDetails } from "./page";

interface SpottedTabProps {
  speciesList: LocationSpeciesWithDetails[];
  totalSpecies: number;
  totalSpeciesAtLocation: number;
  spottedIds: Set<string>;
  isAuthenticated: boolean;
  authChecked: boolean;
  locationName: string;
  locationId: string;
  onLogSighting?: (speciesId?: string) => void;
}

export function SpottedTab({
  speciesList,
  totalSpecies,
  totalSpeciesAtLocation,
  spottedIds,
  isAuthenticated,
  authChecked,
  locationName,
  onLogSighting,
}: SpottedTabProps) {
  const BATCH_SIZE = 24;
  const spottedCount = spottedIds.size;
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sort: spotted first, then by observation count
  const sortedSpecies = useMemo(() => {
    return [...speciesList].sort((a, b) => {
      const aSpotted = spottedIds.has(a.species.id);
      const bSpotted = spottedIds.has(b.species.id);
      if (aSpotted && !bSpotted) return -1;
      if (!aSpotted && bSpotted) return 1;
      return (b.locationSpecies.total_observations ?? 0) - (a.locationSpecies.total_observations ?? 0);
    });
  }, [speciesList, spottedIds]);

  // Filter by search query
  const filteredSpecies = useMemo(() => {
    if (!searchQuery.trim()) return sortedSpecies;
    const q = searchQuery.toLowerCase();
    return sortedSpecies.filter(
      ({ species }) =>
        species.name.toLowerCase().includes(q) ||
        (species.scientific_name && species.scientific_name.toLowerCase().includes(q))
    );
  }, [sortedSpecies, searchQuery]);

  const visibleSpecies = useMemo(
    () => filteredSpecies.slice(0, visibleCount),
    [filteredSpecies, visibleCount]
  );

  const hasMore = visibleCount < filteredSpecies.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredSpecies.length));
  }, [filteredSpecies.length]);

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [searchQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div>
      {/* ── Progress section ────────────────────────── */}
      {authChecked && (
        <div className="mb-6">
          {isAuthenticated ? (
            <div className="rounded-xl bg-white border border-slate-100 p-4 md:p-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold text-deep flex items-center gap-1.5">
                  {spottedCount} of {totalSpecies} spotted
                  <button
                    onClick={() => setShowInfo((v) => !v)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="What does spottable mean?"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </button>
                </span>
                <span className="text-xs text-slate-400">
                  {totalSpecies > 0 ? Math.round((spottedCount / totalSpecies) * 100) : 0}%
                </span>
              </div>
              {showInfo && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-2.5 leading-relaxed">
                  {totalSpecies} of {totalSpeciesAtLocation} species here are marked as spottable — the most charismatic, visible species selected by observation frequency. Tiny or cryptic species like sponges and worms are excluded.
                </p>
              )}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${totalSpecies > 0 ? (spottedCount / totalSpecies) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <Link
                  href="/log"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-teal-600 transition-colors"
                >
                  View your swim log
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
                {onLogSighting && (
                  <button
                    onClick={() => onLogSighting()}
                    className="text-xs font-medium text-coral hover:text-coral-dark transition-colors"
                  >
                    + Log sighting
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/signup"
              className="block rounded-xl bg-white border border-slate-100 p-4 md:p-5 hover:border-teal-200 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-deep flex items-center gap-1.5">
                    0 of {totalSpecies} spotted
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setShowInfo((v) => !v);
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="What does spottable mean?"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </button>
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sign up to start collecting species at {locationName}
                  </p>
                </div>
                <span className="text-xs font-medium text-coral group-hover:text-coral-dark transition-colors">
                  Sign up &rarr;
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
                <div className="h-full w-0 bg-slate-200 rounded-full" />
              </div>
              {showInfo && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-2.5 leading-relaxed">
                  {totalSpecies} of {totalSpeciesAtLocation} species here are marked as spottable — the most charismatic, visible species selected by observation frequency. Tiny or cryptic species like sponges and worms are excluded.
                </p>
              )}
            </Link>
          )}
        </div>
      )}

      {/* ── Search ──────────────────────────────────── */}
      <div className="relative mb-5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search species..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Checklist grid ───────────────────────────── */}
      <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }}>
        {visibleSpecies.map(({ species, locationSpecies, currentMonthLikelihood, activeMonthCount, isInSeason }) => {
          let displayLikelihood: Likelihood = "rare";
          if (currentMonthLikelihood) {
            displayLikelihood = currentMonthLikelihood;
          } else if (locationSpecies.confidence != null) {
            if (locationSpecies.confidence >= 0.4) displayLikelihood = "common";
            else if (locationSpecies.confidence >= 0.2) displayLikelihood = "occasional";
          }

          const isSpotted = spottedIds.has(species.id);

          return (
            <div key={species.id} className="relative group/card">
              <SpeciesCard
                slug={species.slug}
                commonName={species.name}
                scientificName={species.scientific_name}
                heroImageUrl={species.hero_image_url}
                likelihood={displayLikelihood}
                activeMonths={activeMonthCount}
                isInSeason={isInSeason}
                isSpotted={isSpotted}
                dangerNote={species.danger_note}
              />
              {/* Quick-log button — unspotted only, redirects to login if not authenticated */}
              {!isSpotted && onLogSighting && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLogSighting(species.id);
                  }}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md z-10 hover:bg-coral hover:text-white text-slate-500 transition-colors"
                  title={`Log ${species.name} sighting`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </ResponsiveGrid>
      {hasMore && (
        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      )}
    </div>
  );
}
