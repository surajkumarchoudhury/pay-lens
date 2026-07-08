import { cn } from "@/lib/utils";

/**
 * Loading placeholders for the dashboard's streamed sections. Each carries a
 * `data-report-skeleton` marker so the PDF export can wait until every section
 * has resolved (i.e. no skeletons remain) before capturing the report.
 */

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      data-report-skeleton
      className={cn(
        "animate-pulse rounded-xs border border-border/60 bg-muted/40",
        className,
      )}
    />
  );
}

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} className="h-24" />
      ))}
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} className="h-72" />
      ))}
    </div>
  );
}

export function PayPairSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SkeletonCard className="h-72" />
      <SkeletonCard className="h-72" />
    </div>
  );
}

export function ChartSkeleton() {
  return <SkeletonCard className="h-72" />;
}
