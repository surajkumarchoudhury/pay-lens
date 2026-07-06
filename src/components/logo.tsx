import { cn } from "@/lib/utils";

/**
 * Text-only wordmark: "Pay" (red) + "Lens".
 * `onDark` switches "Lens" to white for use on the navy header.
 */
export function Logo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("font-bold tracking-tight select-none", className)}>
      <span className={onDark ? "text-red-500" : "text-red-700"}>Pay</span>
      <span className={onDark ? "text-white" : "text-blue-800"}>Lens</span>
    </span>
  );
}
