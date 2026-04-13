interface SeasonBadgeProps {
  /** Number of active months (1-12). Badge only renders if ≤ 8. */
  activeMonths: number;
  /** Whether the current month is an active month. */
  isCurrentlyActive: boolean;
  className?: string;
}

export function SeasonBadge({
  activeMonths,
  isCurrentlyActive,
  className = "",
}: SeasonBadgeProps) {
  // Only show for genuinely seasonal species (active ≤8 months) that are currently in season
  if (activeMonths > 8 || !isCurrentlyActive) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 ${className}`}
    >
      <span className="season-dot" aria-hidden="true" />
      In season
    </span>
  );
}
