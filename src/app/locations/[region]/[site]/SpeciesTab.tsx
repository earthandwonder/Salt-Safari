"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SpeciesCard } from "@/components/SpeciesCard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import type { Likelihood } from "@/components/LikelihoodPill";
import type { LocationSpeciesWithDetails } from "./page";

interface SpeciesTabProps {
  speciesList: LocationSpeciesWithDetails[];
  totalSpecies: number;
  inSeasonCount: number;
  spottedIds: Set<string>;
  isAuthenticated: boolean;
  authChecked: boolean;
  locationName: string;
  onLogSighting?: (speciesId?: string) => void;
}

type SeasonFilter = "all" | "in-season";
type LikelihoodFilter = "all" | "common" | "occasional" | "rare";

export function SpeciesTab({
  speciesList,
  totalSpecies,
  inSeasonCount,
  spottedIds,
  isAuthenticated,
  authChecked,
  locationName,
  onLogSighting,
}: SpeciesTabProps) {
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("all");
  const [likelihoodFilter, setLikelihoodFilter] = useState<LikelihoodFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const spottedCount = spottedIds.size;

  return (
    <div>
      {/* ── Collection progress bar ────────────────── */}
      {authChecked && (
        <div className="mb-6">
          {isAuthenticated ? (
            <div className="rounded-xl bg-white border border-slate-100 p-4 md:p-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold text-deep">
                  {spottedCount} of {totalSpecies} spotted
                </span>
                <div className="flex items-center gap-3">
                  {onLogSighting && (
                    <button
                      onClick={() => onLogSighting()}
                      className="text-xs font-medium text-coral hover:text-coral-dark transition-colors"
                    >
                      + Log sighting
                    </button>
                  )}
                  <span className="text-xs text-slate-400">
                    {totalSpecies > 0 ? Math.round((spottedCount / totalSpecies) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${totalSpecies > 0 ? (spottedCount / totalSpecies) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <Link
              href="/signup"
              className="block rounded-xl bg-white border border-slate-100 p-4 md:p-5 hover:border-teal-200 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-deep">
                    0 of {totalSpecies} spotted
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
            </Link>
          )}
        </div>
      )}

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
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
            />
          </div>
        </div>
      </div>

      {/* ── Species Grid ───────────────────────────── */}
      {filteredSpecies.length > 0 ? (
        <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }}>
          {filteredSpecies.map(({ species, locationSpecies, currentMonthLikelihood, activeMonthCount, isInSeason }) => {
            // Determine display likelihood: use current month if available, otherwise derive from confidence
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
                />
                {/* Quick-log button — show for authenticated users on unspotted species */}
                {isAuthenticated && !isSpotted && onLogSighting && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onLogSighting(species.id);
                    }}
                    className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 group-hover/card:opacity-100 transition-opacity z-10 hover:bg-coral hover:text-white text-slate-500"
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
