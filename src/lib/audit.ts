import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/pagination";

/** One field that changed in an audit entry (old → new). */
export type AuditDiffRow = {
  field: string;
  old: string | null;
  new: string | null;
};

/** A single audit-log entry with a pre-computed field-level diff. */
export type AuditEntry = {
  id: string;
  action: string; // CREATE | UPDATE | DELETE
  entity: string; // human label, e.g. "Compensation"
  changedBy: string; // user email ("User")
  createdAt: string; // ISO ("Date")
  // The affected employee ("Name"); null if the row was detached (SetNull).
  employeeId: string | null;
  employeeName: string | null;
  employeeNumber: string | null;
  diff: AuditDiffRow[];
};

export type AuditLogResult = {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

// Internal book-keeping keys that shouldn't surface in the diff.
const AUDIT_IGNORE_KEYS = new Set(["recordId"]);
// Friendly labels for the fields we currently audit.
const AUDIT_FIELD_LABELS: Record<string, string> = {
  basePay: "Base pay",
  totalComp: "Total comp",
  compaRatio: "Compa-ratio",
  basePayUsd: "Base pay (USD)",
  name: "Name",
  baseCurrency: "Base currency",
  avatarUrl: "Logo",
};
// Map stored entity names to something readable in the table.
const AUDIT_ENTITY_LABELS: Record<string, string> = {
  SalaryRecord: "Compensation",
  Employee: "Employee",
  Organization: "Organization",
};

/** Normalize an audited value to a display string (numbers get separators). */
function formatAuditValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") return value.toLocaleString("en-US");
  if (typeof value === "string") {
    const n = Number(value);
    return value.trim() !== "" && Number.isFinite(n)
      ? n.toLocaleString("en-US")
      : value;
  }
  return String(value);
}

/** Diff two audit JSON snapshots into the fields that actually changed. */
function buildAuditDiff(before: unknown, after: unknown): AuditDiffRow[] {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = new Set(
    [...Object.keys(b), ...Object.keys(a)].filter(
      (k) => !AUDIT_IGNORE_KEYS.has(k),
    ),
  );
  const rows: AuditDiffRow[] = [];
  for (const key of keys) {
    const oldVal = formatAuditValue(b[key]);
    const newVal = formatAuditValue(a[key]);
    if (oldVal === newVal) continue;
    rows.push({
      field: AUDIT_FIELD_LABELS[key] ?? key,
      old: oldVal,
      new: newVal,
    });
  }
  return rows;
}

/** Clamp a raw page-size to an allowed option (shared with the employee list). */
function normalizePageSize(value: number | undefined): number {
  return value && (PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
    ? value
    : DEFAULT_PAGE_SIZE;
}

/**
 * Organization-wide change history, newest first — the "who changed what, when"
 * trail surfaced on the Audit page. Each entry carries a field-level diff
 * computed from the stored before/after snapshots, plus the affected employee.
 */
export async function listAuditLog(params: {
  page?: number;
  pageSize?: number;
}): Promise<AuditLogResult> {
  const pageSize = normalizePageSize(params.pageSize);
  const page = Math.max(1, params.page ?? 1);

  const [total, rows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entity: true,
        before: true,
        after: true,
        changedBy: true,
        createdAt: true,
        employeeId: true,
        employee: {
          select: { firstName: true, lastName: true, employeeNumber: true },
        },
      },
    }),
  ]);

  const entries: AuditEntry[] = rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity: AUDIT_ENTITY_LABELS[r.entity] ?? r.entity,
    changedBy: r.changedBy,
    createdAt: r.createdAt.toISOString(),
    employeeId: r.employeeId,
    employeeName: r.employee
      ? `${r.employee.firstName} ${r.employee.lastName}`
      : null,
    employeeNumber: r.employee?.employeeNumber ?? null,
    diff: buildAuditDiff(r.before, r.after),
  }));

  return {
    entries,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
