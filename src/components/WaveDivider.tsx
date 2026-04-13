interface WaveDividerProps {
  /** Fill color for the wave shape. Defaults to white. */
  fill?: string;
  /** Whether the wave faces up (default) or is flipped. */
  flip?: boolean;
  className?: string;
}

export function WaveDivider({
  fill = "#ffffff",
  flip = false,
  className = "",
}: WaveDividerProps) {
  return (
    <div
      className={`wave-divider ${flip ? "rotate-180" : ""} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,30 C200,60 400,0 600,30 C800,60 1000,0 1200,30 L1200,60 L0,60 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
