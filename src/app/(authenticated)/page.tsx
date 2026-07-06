import { DashboardKpis } from "@/components/analytics/kpi-cards";
import {
  DonutChartCard,
  type DonutSlice,
} from "@/components/analytics/donut-chart-card";
import { HeadcountByDepartmentChart } from "@/components/analytics/headcount-by-department-chart";
import { ExportDashboardPdf } from "@/components/analytics/export-dashboard-pdf";
import {
  getDashboardStats,
  getGenderBreakdown,
  getHeadcountByDepartment,
} from "@/lib/analytics";

const GENDER_META: Record<string, { label: string; color: string }> = {
  MALE: { label: "Male", color: "#3b82f6" },
  FEMALE: { label: "Female", color: "#ec4899" },
  OTHER: { label: "Other", color: "#8b5cf6" },
  UNDISCLOSED: { label: "Undisclosed", color: "#94a3b8" },
};
const GENDER_ORDER = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"];

export default async function DashboardPage() {
  const [stats, genderRows, headcountByDept] = await Promise.all([
    getDashboardStats(),
    getGenderBreakdown(),
    getHeadcountByDepartment(),
  ]);

  const compaBand: DonutSlice[] = [
    {
      name: "Below band",
      value: stats.belowBandCount,
      color: "#f59e0b",
      href: "/employees?crMax=0.9",
    },
    {
      name: "Within band",
      value: stats.withinBandCount,
      color: "#10b981",
      href: "/employees?crMin=0.9&crMax=1.1",
    },
    {
      name: "Above band",
      value: stats.aboveBandCount,
      color: "#6366f1",
      href: "/employees?crMin=1.1",
    },
  ];

  const workMode: DonutSlice[] = [
    {
      name: "Remote",
      value: stats.remoteCount,
      color: "var(--color-primary)",
      href: "/employees?mode=remote",
    },
    {
      name: "On-site",
      value: stats.headcount - stats.remoteCount,
      color: "#94a3b8",
      href: "/employees?mode=onsite",
    },
  ];

  const status: DonutSlice[] = [
    {
      name: "Active",
      value: stats.activeCount,
      color: "#10b981",
      href: "/employees?status=ACTIVE",
    },
    {
      name: "On leave",
      value: stats.onLeaveCount,
      color: "#f59e0b",
      href: "/employees?status=ON_LEAVE",
    },
  ];

  const genderByKey = new Map(genderRows.map((g) => [g.gender, g.count]));
  const gender: DonutSlice[] = GENDER_ORDER.filter((k) =>
    genderByKey.has(k),
  ).map((k) => ({
    name: GENDER_META[k].label,
    value: genderByKey.get(k) ?? 0,
    color: GENDER_META[k].color,
    href: `/employees?gender=${k}`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Compensation insights across the organization. Figures are
            USD-normalized and exclude terminated employees.
          </p>
        </div>
        <ExportDashboardPdf />
      </div>

      <div id="dashboard-report" className="space-y-4">
        <DashboardKpis stats={stats} />

        <div data-pdf-grid="charts" className="grid gap-3 md:grid-cols-2">
          <DonutChartCard
            title="Compa-ratio band"
            description="Pay vs. level band · click a slice to view employees"
            data={compaBand}
            valueLabel="Employees"
            csvFilename="compa-ratio-band"
          />
          <DonutChartCard
            title="Work mode"
            description="Remote vs. on-site · click a slice to view employees"
            data={workMode}
            valueLabel="Employees"
            csvFilename="work-mode"
          />
          <DonutChartCard
            title="Status"
            description="Active vs. on leave · click a slice to view employees"
            data={status}
            valueLabel="Employees"
            csvFilename="status"
          />
          <DonutChartCard
            title="Gender"
            description="Workforce gender distribution · click a slice to view employees"
            data={gender}
            valueLabel="Employees"
            csvFilename="gender"
          />
        </div>

        <HeadcountByDepartmentChart data={headcountByDept} />
      </div>
    </div>
  );
}
