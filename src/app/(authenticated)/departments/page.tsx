import { DepartmentsTable } from "@/components/departments/departments-table";
import { listDepartments, type SortDir } from "@/lib/departments";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sortBy = first(sp.sort) ?? null;
  const sortDir: SortDir = first(sp.dir) === "desc" ? "desc" : "asc";

  const rows = await listDepartments({
    sortBy: sortBy ?? undefined,
    sortDir,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="text-sm text-muted-foreground">
          Departments with headcount and average compensation.
        </p>
      </div>

      <DepartmentsTable rows={rows} sortBy={sortBy} sortDir={sortDir} />
    </div>
  );
}
