import type { SpotterTier } from "@/lib/spotter-tiers";

interface SpotterTierBadgeProps {
  tier: SpotterTier;
  variant?: "light" | "dark";
}

const tierStyles: Record<string, { ring: string; text: string; darkRing: string; darkText: string }> = {
  "Landlubber": {
    ring: "ring-slate-300",
    text: "text-slate-500",
    darkRing: "ring-white/20",
    darkText: "text-white/50",
  },
  "Beachcomber": {
    ring: "ring-sky-300",
    text: "text-sky-600",
    darkRing: "ring-sky-400/40",
    darkText: "text-sky-300",
  },
  "Rockpool Ranger": {
    ring: "ring-teal-400",
    text: "text-teal-600",
    darkRing: "ring-teal-400/40",
    darkText: "text-teal-300",
  },
  "Reef Scout": {
    ring: "ring-emerald-400",
    text: "text-emerald-600",
    darkRing: "ring-emerald-400/40",
    darkText: "text-emerald-300",
  },
  "Current Rider": {
    ring: "ring-cyan-400",
    text: "text-cyan-700",
    darkRing: "ring-cyan-400/40",
    darkText: "text-cyan-300",
  },
  "Kelp Keeper": {
    ring: "ring-blue-400",
    text: "text-blue-700",
    darkRing: "ring-blue-400/40",
    darkText: "text-blue-300",
  },
  "Tide Master": {
    ring: "ring-violet-400",
    text: "text-violet-700",
    darkRing: "ring-violet-400/40",
    darkText: "text-violet-300",
  },
  "Sea Legend": {
    ring: "ring-amber-400",
    text: "text-amber-700",
    darkRing: "ring-amber-400/50",
    darkText: "text-amber-200",
  },
};

const fallback = tierStyles["Landlubber"];

export function SpotterTierBadge({ tier, variant = "light" }: SpotterTierBadgeProps) {
  const styles = tierStyles[tier.name] ?? fallback;
  const isDark = variant === "dark";

  return (
    <span
      className={`inline-flex items-center px-3.5 py-1 rounded-full font-display text-xs font-semibold tracking-wide ring-1 ring-inset ${
        isDark
          ? `${styles.darkRing} ${styles.darkText}`
          : `${styles.ring} ${styles.text}`
      }`}
    >
      {tier.name}
    </span>
  );
}
