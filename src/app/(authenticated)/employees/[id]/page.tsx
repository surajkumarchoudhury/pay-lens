import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  CompensationCard,
  type CurrentCompensation,
} from "@/components/employees/compensation-card";
import { CompensationHistory } from "@/components/employees/compensation-history";
import { EmployeeProfileCard } from "@/components/employees/employee-profile-card";
import { getSession } from "@/lib/auth/session";
import { getEmployeeFormReference } from "@/lib/employee-form";
import { getEmployeeDetail } from "@/lib/employees";
import type { Level } from "@/lib/salary-bands";

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

  // Reference for the profile edit selects — only HR can edit, so skip the
  // queries entirely for viewers.
  const reference = canEdit
    ? await getEmployeeFormReference()
    : { departments: [], countries: [] };

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
    <div className="mx-auto flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="flex shrink-0 flex-col gap-5 lg:sticky lg:top-0 lg:w-[370px]">
        <Link
          href="/employees"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
          Employees
        </Link>

        <EmployeeProfileCard
          employee={employee}
          reference={reference}
          canEdit={canEdit}
        />
      </aside>

      <div className="min-w-0 flex-1 space-y-10 pb-10">
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
