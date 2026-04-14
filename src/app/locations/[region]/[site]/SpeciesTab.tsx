"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { SpeciesCard } from "@/components/SpeciesCard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import type { Likelihood } from "@/components/LikelihoodPill";
import type { LocationSpeciesWithDetails } from "./page";

interface SpeciesTabProps {
  speciesList: LocationSpeciesWithDetails[];
  totalSpecies: number;
  inSeasonCount: number;
  alertedSpeciesIds: Set<string>;
  isAuthenticated: boolean;
  locationName: string;
  locationId: string;
  onAlertSubscribe?: (speciesId: string, speciesName: string) => void;
}

type SeasonFilter = "all" | "in-season";
type LikelihoodFilter = "all" | "common" | "occasional" | "rare";

export function SpeciesTab({
  speciesList,
  totalSpecies,
  inSeasonCount,
  alertedSpeciesIds,
  isAuthenticated,
  locationName,
  locationId,
  onAlertSubscribe,
}: SpeciesTabProps) {
  const BATCH_SIZE = 24;
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("all");
  const [likelihoodFilter, setLikelihoodFilter] = useState<LikelihoodFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredSpecies = useMemo(() => {
    let result = speciesList;

    // Season filter
    if (seasonFilter === "in-season") {
      result = result.filter((s) => s.isInSeason);
    }

    // Likelihood filter
    if (likelihoodFilter !== "all") {
      result = result.filter((s) => s.currentMonthLikelihood === likelihoodFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.species.name.toLowerCase().includes(q) ||
          (s.species.scientific_name?.toLowerCase().includes(q) ?? false)
      );
    }

    return result;
  }, [speciesList, seasonFilter, likelihoodFilter, searchQuery]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [seasonFilter, likelihoodFilter, searchQuery]);

  const visibleSpecies = useMemo(
    () => filteredSpecies.slice(0, visibleCount),
    [filteredSpecies, visibleCount]
  );

  const hasMore = visibleCount < filteredSpecies.length;

  // Load more when sentinel enters viewport
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredSpecies.length));
  }, [filteredSpecies.length]);

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
      {/* ── Count + Filters ────────────────────────── */}
      <div className="mb-6 space-y-4">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-deep">{filteredSpecies.length}</span>
          {filteredSpecies.length !== totalSpecies && ` of ${totalSpecies}`} species
          {seasonFilter === "in-season" ? " in season now" : ` recorded at ${locationName}`}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {/* Season toggle */}
          <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
            <button
              onClick={() => setSeasonFilter("all")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                seasonFilter === "all"
                  ? "bg-deep text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSeasonFilter("in-season")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
                seasonFilter === "in-season"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  seasonFilter === "in-season" ? "bg-emerald-200" : "bg-emerald-400"
                }`}
              />
              In season ({inSeasonCount})
            </button>
          </div>

          {/* Likelihood filter */}
          <select
            value={likelihoodFilter}
            onChange={(e) => setLikelihoodFilter(e.target.value as LikelihoodFilter)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
            suppressHydrationWarning
          >
            <option value="all">All likelihood</option>
            <option value="common">Common</option>
            <option value="occasional">Occasional</option>
            <option value="rare">Rare</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search species..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              suppressHydrationWarning
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Species Grid ───────────────────────────── */}
      {filteredSpecies.length > 0 ? (
        <>
        <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }}>
          {visibleSpecies.map(({ species, locationSpecies, currentMonthLikelihood, activeMonthCount, isInSeason }) => {
            // Determine display likelihood: use current month if available, otherwise derive from confidence
            let displayLikelihood: Likelihood = "rare";
            if (currentMonthLikelihood) {
              displayLikelihood = currentMonthLikelihood;
            } else if (locationSpecies.confidence != null) {
              if (locationSpecies.confidence >= 0.4) displayLikelihood = "common";
              else if (locationSpecies.confidence >= 0.2) displayLikelihood = "occasional";
            }

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
                  dangerNote={species.danger_note}
                />
                {/* Alert bell — show for authenticated users, on species not already alerted */}
                {isAuthenticated && onAlertSubscribe && !alertedSpeciesIds.has(species.id) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAlertSubscribe(species.id, species.name);
                    }}
                    className="absolute top-10 left-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 group-hover/card:opacity-100 transition-opacity z-10 hover:bg-teal-500 hover:text-white text-slate-500"
                    title={`Get alerts for ${species.name}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </button>
                )}
                {/* Already alerted indicator */}
                {alertedSpeciesIds.has(species.id) && (
                  <div
                    className="absolute top-10 left-2 w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shadow-md z-10"
                    title="Alert set"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </ResponsiveGrid>
        {hasMore && (
          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
        )}
        </>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">
            No species match your current filters.
          </p>
          <button
            onClick={() => {
              setSeasonFilter("all");
              setLikelihoodFilter("all");
              setSearchQuery("");
            }}
            className="mt-3 text-teal-600 hover:text-teal-700 text-xs font-medium transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
