export type Likelihood = "common" | "occasional" | "rare";

interface LikelihoodPillProps {
  likelihood: Likelihood;
  className?: string;
}

const config: Record<Likelihood, { label: string; bg: string; text: string; dot: string }> = {
  common: {
    label: "Common",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  occasional: {
    label: "Occasional",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  rare: {
    label: "Rare",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
};

export function LikelihoodPill({ likelihood, className = "" }: LikelihoodPillProps) {
  const c = config[likelihood];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${c.bg} ${c.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
