import Link from "next/link";
import {
  AlertTriangle,
  Gauge,
  Laptop,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { DashboardStats } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Accent = "default" | "positive" | "warning";

const ACCENT_TEXT: Record<Accent, string> = {
  default: "text-foreground",
  positive: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-500",
};

/** "$1.5B", "$820.4K" — compact so large payrolls stay legible in a card. */
function compactUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  accent = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  href?: string;
  accent?: Accent;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div
        className={cn(
          "mt-3 text-2xl font-semibold tabular-nums",
          ACCENT_TEXT[accent],
        )}
      >
        {value}
      </div>
      <div className="mt-1 min-h-4 text-xs text-muted-foreground">
        {sub ?? ""}
      </div>
    </>
  );

  const className = cn(
    "block rounded-xs border border-border/60 bg-card p-4",
    href && "transition-colors hover:border-primary/50 hover:bg-muted/30",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Top-of-dashboard KPI strip. All money is USD-normalized. */
export function DashboardKpis({ stats }: { stats: DashboardStats }) {
  const avgComp = stats.avgCompaRatio;
  // Below-target average is worth flagging; comfortably within band reads well.
  const compaAccent: Accent =
    avgComp == null
      ? "default"
      : avgComp < 0.9
        ? "warning"
        : avgComp <= 1.1
          ? "positive"
          : "default";

  return (
    <div
      data-pdf-grid="kpis"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
    >
      <KpiCard
        label="Headcount"
        value={stats.headcount.toLocaleString()}
        sub={`${stats.activeCount.toLocaleString()} active · ${stats.onLeaveCount.toLocaleString()} on leave`}
        icon={Users}
      />
      <KpiCard
        label="Annual payroll"
        value={compactUsd(stats.annualPayrollUsd)}
        sub={
          stats.avgTotalUsd != null
            ? `${formatMoney(Math.round(stats.avgTotalUsd), "USD")} avg / employee`
            : undefined
        }
        icon={Wallet}
      />
      <KpiCard
        label="Avg base pay"
        value={
          stats.avgBaseUsd != null
            ? formatMoney(Math.round(stats.avgBaseUsd), "USD")
            : "—"
        }
        sub="Annualized, USD"
        icon={TrendingUp}
      />
      <KpiCard
        label="Avg compa-ratio"
        value={avgComp != null ? `${avgComp.toFixed(2)}×` : "—"}
        sub={`${Math.round(stats.withinBandPct)}% within band (0.9–1.1)`}
        icon={Gauge}
        href="/employees?sort=compa&dir=asc"
        accent={compaAccent}
      />
      <KpiCard
        label="Below band"
        value={stats.belowBandCount.toLocaleString()}
        sub={`${Math.round(stats.belowBandPct)}% of workforce · compa < 0.9`}
        icon={AlertTriangle}
        href="/employees?crMax=0.9"
        accent={stats.belowBandCount > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Remote"
        value={`${Math.round(stats.remotePct)}%`}
        sub={`${stats.remoteCount.toLocaleString()} remote · ${(stats.headcount - stats.remoteCount).toLocaleString()} on-site`}
        icon={Laptop}
        href="/employees?mode=remote"
      />
    </div>
  );
}
