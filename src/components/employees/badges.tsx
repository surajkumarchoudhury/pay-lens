import type { EmployeeStatus } from "@prisma/client";

import type { BandPlacement } from "@/lib/salary-bands";
import { cn } from "@/lib/utils";

/**
 * Presentational status / compa-ratio / work-mode badges shared by the employee
 * table and the detail page, so both render identically. Pure (no hooks), so
 * they work in server and client components alike.
 */

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ON_LEAVE: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  TERMINATED: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const BAND_STYLES: Record<BandPlacement, string> = {
  below: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  within: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  above: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

const BAND_LABEL: Record<BandPlacement, string> = {
  below: "Below",
  within: "Within",
  above: "Above",
};

/** Compa-ratio pill: the ratio to 2dp plus where it sits relative to the band. */
export function CompaBadge({
  ratio,
  placement,
}: {
  ratio: number | null;
  placement: BandPlacement | null;
}) {
  if (ratio == null || !placement) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        BAND_STYLES[placement],
      )}
      title={`Compa-ratio ${ratio.toFixed(2)} — ${BAND_LABEL[placement]} band`}
    >
      <span className="tabular-nums">{ratio.toFixed(2)}</span>
      <span className="opacity-70">{BAND_LABEL[placement]}</span>
    </span>
  );
}

export function WorkModeBadge({ remote }: { remote: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        remote
          ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      {remote ? "Remote" : "On-site"}
    </span>
  );
}
