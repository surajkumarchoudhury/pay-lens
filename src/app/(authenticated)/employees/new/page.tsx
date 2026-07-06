import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { NewEmployeeForm } from "@/components/employees/new-employee-form";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeFormReference } from "@/lib/employee-form";

export const metadata = { title: "Add employees · PayLens" };

export default async function NewEmployeePage() {
  // HR-only: viewers hitting the URL directly get the 403 boundary.
  await requireRole("HR_MANAGER");
  const reference = await getEmployeeFormReference();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="space-y-3">
        <Link
          href="/employees"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Employees
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Add employees</h1>
          <p className="text-sm text-muted-foreground">
            Onboard one or more hires. Each needs an initial compensation record;
            employee numbers are assigned automatically.
          </p>
        </div>
      </div>

      <NewEmployeeForm reference={reference} />
    </div>
  );
}
