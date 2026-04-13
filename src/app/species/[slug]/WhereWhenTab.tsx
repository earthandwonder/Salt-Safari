"use client";

import Link from "next/link";
import { LikelihoodPill } from "@/components/LikelihoodPill";
import type { Likelihood } from "@/components/LikelihoodPill";
import type { LocationOccurrence } from "./page";

interface WhereWhenTabProps {
  locationOccurrences: LocationOccurrence[];
}

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const likelihoodColors: Record<string, string> = {
  common: "bg-emerald-500",
  occasional: "bg-amber-400",
  rare: "bg-slate-400",
};

const likelihoodOpacity: Record<string, string> = {
  common: "opacity-100",
  occasional: "opacity-80",
  rare: "opacity-50",
};

/** Derive a likelihood from confidence score when no seasonality data exists. */
function confidenceToLikelihood(confidence: number | null): Likelihood {
  if (!confidence || confidence < 0.2) return "rare";
  if (confidence < 0.5) return "occasional";
  return "common";
}

function MiniSeasonalityChart({ seasonality }: { seasonality: LocationOccurrence["seasonality"] }) {
  const monthMap = new Map(seasonality.map((s) => [s.month, s.likelihood]));
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="flex items-end gap-[3px]">
      {MONTH_LABELS.map((label, idx) => {
        const month = idx + 1;
        const likelihood = monthMap.get(month);
        const isCurrent = month === currentMonth;

        return (
          <div key={month} className="flex flex-col items-center gap-1">
            <div
              className={`w-4 md:w-5 h-6 rounded-sm transition-colors ${
                likelihood
                  ? `${likelihoodColors[likelihood]} ${likelihoodOpacity[likelihood]}`
                  : "bg-slate-100"
              } ${isCurrent ? "ring-1 ring-deep/30 ring-offset-1" : ""}`}
              title={`${label}: ${likelihood ?? "no data"}`}
            />
            <span className={`text-[9px] md:text-[10px] leading-none ${isCurrent ? "text-deep font-bold" : "text-slate-400"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function WhereWhenTab({ locationOccurrences }: WhereWhenTabProps) {
  if (locationOccurrences.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 p-8 md:p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold text-deep mb-2">
          No location data yet
        </h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          We haven&apos;t recorded this species at any locations yet. Check back as we add more dive sites.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-slate-500">
        <span className="font-medium text-slate-700">Monthly activity:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Common
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400 opacity-80" />
          Occasional
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-400 opacity-50" />
          Rare
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-100" />
          No data
        </span>
      </div>

      {/* Location rows */}
      <div className="space-y-3">
        {locationOccurrences.map((occ) => {
          const likelihood: Likelihood =
            occ.currentMonthLikelihood ?? confidenceToLikelihood(occ.locationSpecies.confidence);

          return (
            <div
              key={occ.locationSpecies.id}
              className="rounded-xl bg-white border border-slate-100 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              {/* Left: location info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/locations/${occ.location.region.slug}/${occ.location.slug}`}
                      className="font-display text-base font-semibold text-deep hover:text-coral transition-colors truncate block"
                    >
                      {occ.location.name}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {occ.location.region.name}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <LikelihoodPill likelihood={likelihood} />
                </div>
              </div>

              {/* Right: mini seasonality chart */}
              <div className="flex-shrink-0">
                <MiniSeasonalityChart seasonality={occ.seasonality} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
