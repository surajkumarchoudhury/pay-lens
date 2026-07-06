"use client";

import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartCard, type CsvExport } from "@/components/analytics/chart-card";

/** One donut slice. `href` (optional) makes the slice + legend row clickable. */
export type DonutSlice = {
  name: string;
  value: number;
  color: string;
  href?: string;
};

export function DonutChartCard({
  title,
  description,
  data,
  valueLabel = "Count",
  csvFilename,
}: {
  title: string;
  description?: string;
  data: DonutSlice[];
  valueLabel?: string;
  csvFilename: string;
}) {
  const router = useRouter();
  const total = data.reduce((sum, s) => sum + s.value, 0);

  const csv: CsvExport = {
    filename: csvFilename,
    rows: [[title, valueLabel], ...data.map((s) => [s.name, s.value])],
  };

  const go = (href?: string) => {
    if (href) router.push(href);
  };

  const pct = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <ChartCard title={title} description={description} csv={csv}>
      {total === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No data to chart.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-[160px] w-[160px] shrink-0 [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart tabIndex={-1}>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {data.map((s) => (
                    <Cell
                      key={s.name}
                      fill={s.color}
                      cursor={s.href ? "pointer" : "default"}
                      onClick={() => go(s.href)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--color-foreground)" }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                  formatter={(value) => [
                    `${value} (${pct(Number(value))}%)`,
                    valueLabel,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total — overlaid since recharts has no native center label. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {total.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Total
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {data.map((s) => {
              const row = (
                <>
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {s.name}
                  </span>
                  <span className="tabular-nums font-medium text-foreground">
                    {s.value.toLocaleString()}
                  </span>
                  <span className="w-9 text-right tabular-nums text-xs text-muted-foreground">
                    {pct(s.value)}%
                  </span>
                </>
              );
              return (
                <li key={s.name}>
                  {s.href ? (
                    <button
                      type="button"
                      onClick={() => go(s.href)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-xs px-1 py-0.5 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-1 py-0.5 text-sm">
                      {row}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
