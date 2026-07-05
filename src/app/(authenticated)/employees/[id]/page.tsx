import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { StatusBadge, WorkModeBadge } from "@/components/employees/badges";
import {
  CompensationCard,
  type CurrentCompensation,
} from "@/components/employees/compensation-card";
import { CompensationHistory } from "@/components/employees/compensation-history";
import { Avatar } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth/session";
import { getEmployeeDetail } from "@/lib/employees";
import type { Level } from "@/lib/salary-bands";

const GENDER_LABEL: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNDISCLOSED: "Undisclosed",
};

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Whole-ish tenure from a hire date, e.g. "4y 2m", "7 mo", "1 yr". */
function formatTenure(iso: string): string {
  const months = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
  );
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years <= 0) return `${months} mo`;
  if (rem === 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${years}y ${rem}m`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployeeDetail(id);
  return { title: employee ? `${employee.fullName} · PayLens` : "Employee · PayLens" };
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [employee, session] = await Promise.all([
    getEmployeeDetail(id),
    getSession(),
  ]);
  if (!employee) notFound();

  const current = employee.history.find((h) => h.isCurrent) ?? employee.history[0];
  const canEdit = session?.role === "HR_MANAGER";

  const facts: { label: string; value: string }[] = [
    { label: "Employee ID", value: employee.employeeNumber },
    { label: "Department", value: employee.department },
    { label: "Country", value: employee.country },
    { label: "Hire date", value: formatFullDate(employee.hireDate) },
    { label: "Tenure", value: formatTenure(employee.hireDate) },
    { label: "Gender", value: GENDER_LABEL[employee.gender] ?? employee.gender },
  ];

  const currentComp: CurrentCompensation | null = current
    ? {
        baseLocal: current.baseLocal,
        baseUsd: current.baseUsd,
        totalLocal: current.totalLocal,
        totalUsd: current.totalUsd,
        compaRatio: current.compaRatio,
        bandPlacement: current.bandPlacement,
        frequencyLabel: current.frequencyLabel,
        effectiveDate: current.effectiveDate,
        currencyCode: current.currencyCode,
        currencySymbol: current.currencySymbol,
      }
    : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left: Employee-details inspector panel. Sticky so it stays in view
          while the compensation history scrolls on the right. */}
      <aside className="flex shrink-0 flex-col gap-3 lg:sticky lg:top-0 lg:w-72">
        <Link
          href="/employees"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Employees
        </Link>

        <div className="rounded-xs border border-border/60 bg-card p-5">
          <Avatar
            name={employee.fullName}
            src={employee.avatarUrl}
            className="size-20 rounded-xs text-2xl"
          />
          <h1 className="mt-4 text-lg font-semibold leading-tight text-foreground">
            {employee.fullName}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{employee.title}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {employee.level}
            </span>
            <StatusBadge status={employee.status} />
            <WorkModeBadge remote={employee.isRemote} />
          </div>

          <div className="my-4 border-t border-border/60" />

          <dl className="space-y-0.5">
            {facts.map((f) => (
              <InfoRow key={f.label} label={f.label} value={f.value} />
            ))}
          </dl>

          <div className="my-4 border-t border-border/60" />

          <dt className="text-xs text-muted-foreground">Email</dt>
          <dd className="mt-0.5 break-all text-sm text-foreground">
            {employee.email}
          </dd>
        </div>
      </aside>

      {/* Right: compensation + history */}
      <div className="min-w-0 flex-1 space-y-12 pb-10">
        {currentComp && (
          <CompensationCard
            employeeId={employee.id}
            level={employee.level as Level}
            countryIso2={employee.countryIso2}
            rateToUsd={current.rateToUsd}
            version={current.version}
            canEdit={canEdit}
            current={currentComp}
          />
        )}

        <CompensationHistory history={employee.history} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className="min-w-0 truncate text-right font-medium text-foreground"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
