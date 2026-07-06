import { AuditLogTable } from "@/components/audit/audit-log-table";
import { TablePagination } from "@/components/table-pagination";
import { listAuditLog } from "@/lib/audit";
import { first, parsePage, parsePageSize } from "@/lib/search-params";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { entries, total, page, pageSize, pageCount } = await listAuditLog({
    page: parsePage(first(sp.page)),
    pageSize: parsePageSize(first(sp.pageSize)),
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only trail of employee and salary changes.
        </p>
      </div>

      <div className="min-h-0 flex-1 -mb-4">
        <AuditLogTable entries={entries} />
      </div>

      {total > 0 && (
        <div className="shrink-0 border-t pt-3 -mx-4 px-6">
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            pageCount={pageCount}
            noun="changes"
          />
        </div>
      )}
    </div>
  );
}
