type DangerNote = "harmless" | "venomous" | "can bite or sting" | "poisonous if eaten";

interface DangerPillProps {
  dangerNote: DangerNote | string | null | undefined;
  /** Compact mode for tight spaces (cards). */
  compact?: boolean;
}

const dangerConfig: Record<string, { label: string; shortLabel: string; icon: string }> = {
  venomous: { label: "Venomous", shortLabel: "Venomous", icon: "⚠" },
  "can bite or sting": { label: "Can bite or sting", shortLabel: "Caution", icon: "⚠" },
  "poisonous if eaten": { label: "Poisonous if eaten", shortLabel: "Toxic", icon: "⚠" },
};

export function DangerPill({ dangerNote, compact = false }: DangerPillProps) {
  if (!dangerNote || dangerNote === "harmless") return null;

  const config = dangerConfig[dangerNote];
  if (!config) return null;

  const label = compact ? config.shortLabel : config.label;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
      <span className="text-[10px] leading-none">{config.icon}</span>
      {label}
    </span>
  );
}
