import { cn } from "@/lib/utils";

/**
 * iOS-style activity indicator: 12 rounded spokes arranged in a ring with
 * graded opacity, rotated in 12 discrete steps so the bright "head" ticks
 * around the circle (rather than the smooth sweep of a single-arc spinner).
 * Uses `currentColor`, so color it with a text-* class (e.g. text-muted-foreground)
 * and size it with a size-* class on `className`.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "size-6 text-primary animate-[spin_0.9s_steps(12,end)_infinite]",
        className,
      )}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x="11"
          y="2"
          width="2"
          height="6"
          rx="1"
          fill="currentColor"
          opacity={1 - (i * 0.75) / 11}
          transform={`rotate(${i * 30} 12 12)`}
        />
      ))}
    </svg>
  );
}
