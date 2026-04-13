"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SpeciesCard } from "@/components/SpeciesCard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import type { Likelihood } from "@/components/LikelihoodPill";
import type { LocationSpeciesWithDetails } from "./page";

interface SpottedTabProps {
  speciesList: LocationSpeciesWithDetails[];
  totalSpecies: number;
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
  spottedIds,
  isAuthenticated,
  authChecked,
  locationName,
  onLogSighting,
}: SpottedTabProps) {
  const spottedCount = spottedIds.size;

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

  return (
    <div>
      {/* ── Progress section ────────────────────────── */}
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

      {/* ── Checklist grid ───────────────────────────── */}
      <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }}>
        {sortedSpecies.map(({ species, locationSpecies, currentMonthLikelihood, activeMonthCount, isInSeason }) => {
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
              {/* Quick-log button — authenticated, unspotted only */}
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
    </div>
  );
}
