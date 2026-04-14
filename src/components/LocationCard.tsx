import Image from "next/image";
import Link from "next/link";

interface LocationCardProps {
  regionSlug: string;
  slug: string;
  name: string;
  heroImageUrl: string | null;
  speciesCount: number;
  skillLevel: "beginner" | "intermediate" | "advanced" | null;
  depthMin: number | null;
  depthMax: number | null;
  activities: string[];
  /** Number of species currently in season at this location. */
  inSeasonCount?: number;
  className?: string;
}

const skillColors: Record<string, { bg: string; text: string }> = {
  beginner: { bg: "bg-teal-50", text: "text-teal-700" },
  intermediate: { bg: "bg-amber-50", text: "text-amber-700" },
  advanced: { bg: "bg-rose-50", text: "text-rose-700" },
};

const activityIcons: Record<string, string> = {
  snorkelling: "Snorkel",
  diving: "Dive",
  freediving: "Freedive",
  "shore diving": "Shore",
};

export function LocationCard({
  regionSlug,
  slug,
  name,
  heroImageUrl,
  speciesCount,
  skillLevel,
  depthMin,
  depthMax,
  activities,
  inSeasonCount = 0,
  className = "",
}: LocationCardProps) {
  const skill = skillLevel ? skillColors[skillLevel] : null;

  return (
    <Link
      href={`/locations/${regionSlug}/${slug}`}
      className={`group block card-lift rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100 ${className}`}
    >
      {/* Hero image — 4:3 */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full photo-placeholder-ocean" />
        )}

        {/* Species count badge */}
        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-deep/80 backdrop-blur-sm text-white text-xs font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
            <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
          </svg>
          {speciesCount} species
        </div>

        {/* In season count */}
        {inSeasonCount > 0 && (
          <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-600/80 backdrop-blur-sm text-white text-xs font-medium">
            <span className="season-dot !w-1.5 !h-1.5" aria-hidden="true" />
            {inSeasonCount} in season
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 md:p-4">
        <h3 className="font-display text-base font-semibold text-deep leading-tight">
          {name}
        </h3>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Skill level */}
          {skill && skillLevel && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${skill.bg} ${skill.text}`}
            >
              {skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}
            </span>
          )}

          {/* Depth range */}
          {depthMin != null && depthMax != null && (
            <span className="text-xs text-slate-500">
              {depthMin}–{depthMax}m
            </span>
          )}

          {/* Activities */}
          {activities.map((activity) => (
            <span
              key={activity}
              className="text-xs text-slate-400"
            >
              {activityIcons[activity] ?? activity}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
