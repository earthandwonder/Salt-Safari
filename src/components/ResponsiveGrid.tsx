import { type ReactNode } from "react";

interface ResponsiveGridProps {
  children: ReactNode;
  /** Column counts at each breakpoint. Defaults to 2 mobile, 3 desktop. */
  columns?: { mobile?: number; tablet?: number; desktop?: number };
  /** Tailwind gap class. Defaults to "gap-4 md:gap-6". */
  gap?: string;
  className?: string;
}

const colClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

const mdColClasses: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
};

const lgColClasses: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

export function ResponsiveGrid({
  children,
  columns = {},
  gap = "gap-4 md:gap-6",
  className = "",
}: ResponsiveGridProps) {
  const mobile = columns.mobile ?? 2;
  const tablet = columns.tablet ?? mobile;
  const desktop = columns.desktop ?? 3;

  return (
    <div
      className={`grid ${colClasses[mobile] ?? "grid-cols-2"} ${mdColClasses[tablet] ?? "md:grid-cols-2"} ${lgColClasses[desktop] ?? "lg:grid-cols-3"} ${gap} ${className}`}
    >
      {children}
    </div>
  );
}
