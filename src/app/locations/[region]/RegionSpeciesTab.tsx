"use client";

import { SpeciesCard } from "@/components/SpeciesCard";
import { ResponsiveGrid } from "@/components/ResponsiveGrid";
import type { Likelihood } from "@/components/LikelihoodPill";
import type { RegionSpecies } from "./page";

interface RegionSpeciesTabProps {
  topSpecies: RegionSpecies[];
  regionName: string;
}

function toLikelihood(
  currentMonthLikelihood: "common" | "occasional" | "rare" | null
): Likelihood {
  if (currentMonthLikelihood === "common") return "common";
  if (currentMonthLikelihood === "occasional") return "occasional";
  if (currentMonthLikelihood === "rare") return "rare";
  return "occasional"; // fallback for species with no seasonality
}

export function RegionSpeciesTab({ topSpecies, regionName }: RegionSpeciesTabProps) {
  if (topSpecies.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
        <p className="text-slate-500 text-sm">
          No species data available for {regionName} yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-xl md:text-2xl font-semibold text-deep">
          What you might see in {regionName}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The most commonly spotted species across all locations in this region.
        </p>
      </div>

      <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }}>
        {topSpecies.map((entry) => (
          <SpeciesCard
            key={entry.species.id}
            slug={entry.species.slug}
            commonName={entry.species.name}
            scientificName={entry.species.scientific_name}
            heroImageUrl={entry.species.hero_image_url}
            likelihood={toLikelihood(entry.currentMonthLikelihood)}
            activeMonths={entry.activeMonthCount}
            isInSeason={entry.isInSeason}
            dangerNote={entry.species.danger_note}
          />
        ))}
      </ResponsiveGrid>
    </div>
  );
}
