import Image from "next/image";
import Link from "next/link";
import { LikelihoodPill, type Likelihood } from "./LikelihoodPill";
import { SeasonBadge } from "./SeasonBadge";
import { DangerPill } from "./DangerPill";

interface SpeciesCardProps {
  slug: string;
  commonName: string;
  scientificName: string | null;
  heroImageUrl: string | null;
  likelihood: Likelihood;
  /** Number of active months at this location (1-12). */
  activeMonths?: number;
  /** Whether the current month is active for this species. */
  isInSeason?: boolean;
  /** Whether the user has spotted this species. */
  isSpotted?: boolean;
  /** Total quantity spotted (shows ×N badge when > 1). */
  spottedCount?: number;
  /** Danger classification from FishBase enrichment. */
  dangerNote?: string | null;
  className?: string;
}

export function SpeciesCard({
  slug,
  commonName,
  scientificName,
  heroImageUrl,
  likelihood,
  activeMonths = 12,
  isInSeason = false,
  isSpotted = false,
  spottedCount,
  dangerNote,
  className = "",
}: SpeciesCardProps) {
  return (
    <Link
      href={`/species/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block card-lift rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100 touch-action-manipulation ${className}`}
    >
      {/* Photo — 4:3 aspect ratio */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={commonName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full photo-placeholder-species" />
        )}

        {/* Spotted checkmark badge */}
        {isSpotted && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {/* Quantity badge */}
        {spottedCount != null && spottedCount > 1 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-sm">
            &times;{spottedCount}
          </span>
        )}

        {/* Gradient overlay at bottom for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Card body */}
      <div className="p-3 md:p-4">
        <h3 className="font-display text-base font-semibold text-deep leading-tight truncate">
          {commonName}
        </h3>
        {scientificName && (
          <p className="text-xs text-slate-400 italic mt-0.5 truncate">
            {scientificName}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <LikelihoodPill likelihood={likelihood} />
          <SeasonBadge activeMonths={activeMonths} isCurrentlyActive={isInSeason} />
          <DangerPill dangerNote={dangerNote} compact />
        </div>
      </div>
    </Link>
  );
}
