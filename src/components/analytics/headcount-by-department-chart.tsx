"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, type CsvExport } from "@/components/analytics/chart-card";
import type { DepartmentHeadcount } from "@/lib/analytics";

const ROW_HEIGHT = 30;

export function HeadcountByDepartmentChart({
  data,
}: {
  data: DepartmentHeadcount[];
}) {
  const router = useRouter();

  const goToDepartment = (name: string) => {
    router.push(`/employees?field=department&q=${encodeURIComponent(name)}`);
  };

  const csv: CsvExport = {
    filename: "headcount-by-department",
    rows: [["Department", "Headcount"], ...data.map((d) => [d.name, d.headcount])],
  };

  // Horizontal bars so department names stay readable; height grows with the
  // number of departments (the card scrolls with the page).
  const height = Math.max(220, data.length * ROW_HEIGHT + 24);

  return (
    <ChartCard
      title="Headcount by department"
      description="Active + on-leave employees · click a bar to view them"
      csv={csv}
    >
      {data.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No employees to chart.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
            barCategoryGap={6}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="var(--color-border)"
            />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
              stroke="var(--color-border)"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
              stroke="var(--color-border)"
            />
            <Tooltip
              cursor={{
                fill: "color-mix(in oklab, var(--color-muted) 45%, transparent)",
              }}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
              itemStyle={{ color: "var(--color-foreground)" }}
              formatter={(value) => [String(value), "Headcount"]}
            />
            <Bar
              dataKey="headcount"
              fill="var(--color-primary)"
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
              cursor="pointer"
              onClick={(entry: { name?: string }) => {
                if (entry?.name) goToDepartment(entry.name);
              }}
            >
              {data.map((d) => (
                <Cell key={d.id} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
