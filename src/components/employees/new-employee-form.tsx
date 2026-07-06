"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEmployees } from "@/app/(authenticated)/employees/new/actions";
import { GENDER_OPTIONS } from "@/lib/employee-gender";
import { LEVEL_OPTIONS } from "@/lib/employee-level";
import { validateEmployeeRow } from "@/lib/employee-schema";
import { STATUS_OPTIONS } from "@/lib/employee-status";
import { cn } from "@/lib/utils";

type Reference = {
  departments: { id: string; name: string }[];
  countries: { iso2: string; name: string; currencyCode: string }[];
  frequencies: { id: string; label: string; annualFactor: number }[];
  currencies: { code: string; symbol: string; name: string }[];
};

type Row = {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  title: string;
  level: string;
  status: string;
  isRemote: boolean;
  countryIso2: string;
  departmentId: string;
  hireDate: string;
  dob: string;
  avatarUrl: string;
  currencyCode: string;
  frequencyId: string;
  annualBase: string;
  annualTotal: string;
  effectiveDate: string;
};

/** Domain fields sent to the server / validated (everything except `key`). */
function toPayload(r: Row) {
  const rest: Partial<Row> = { ...r };
  delete rest.key;
  return rest;
}

const selectClass =
  "flex h-10 w-full cursor-pointer rounded-xs border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const invalidClass =
  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30";

let rowSeq = 0;
function nextKey(): string {
  rowSeq += 1;
  return `row-${rowSeq}`;
}

/** Today as YYYY-MM-DD in local time, for the hire-date default. */
function todayLocal(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function blankRow(ref: Reference): Row {
  const country = ref.countries[0];
  return {
    key: nextKey(),
    firstName: "",
    lastName: "",
    email: "",
    gender: "UNDISCLOSED",
    title: "",
    level: "L3",
    status: "ACTIVE",
    isRemote: false,
    countryIso2: country?.iso2 ?? "",
    departmentId: ref.departments[0]?.id ?? "",
    hireDate: todayLocal(),
    dob: "",
    avatarUrl: "",
    currencyCode: country?.currencyCode ?? ref.currencies[0]?.code ?? "USD",
    frequencyId: ref.frequencies[0]?.id ?? "",
    annualBase: "",
    annualTotal: "",
    effectiveDate: "",
  };
}

export function NewEmployeeForm({ reference }: { reference: Reference }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => [blankRow(reference)]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    // Clear the error for any field the user just edited.
    setErrors((prev) => {
      const next = { ...prev };
      for (const field of Object.keys(patch)) delete next[`${key}:${field}`];
      return next;
    });
  }

  function setCountry(key: string, iso2: string) {
    const currency = reference.countries.find((c) => c.iso2 === iso2)?.currencyCode;
    update(key, { countryIso2: iso2, ...(currency ? { currencyCode: currency } : {}) });
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow(reference)]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
    setErrors((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (!k.startsWith(`${key}:`)) next[k] = v;
      }
      return next;
    });
  }

  /** Expand every row that currently has at least one error. */
  function expandRowsWithErrors(errorMap: Record<string, string>) {
    const keysWithErrors = new Set(
      Object.keys(errorMap).map((k) => k.split(":")[0]),
    );
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const key of keysWithErrors) next[key] = false;
      return next;
    });
  }

  function submit() {
    setGeneralError(null);

    // Client-side validation with the shared Zod schema (instant field errors).
    const nextErrors: Record<string, string> = {};
    rows.forEach((r) => {
      const rowErrors = validateEmployeeRow(toPayload(r));
      if (rowErrors) {
        for (const [field, message] of Object.entries(rowErrors)) {
          nextErrors[`${r.key}:${field}`] = message;
        }
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      expandRowsWithErrors(nextErrors);
      return;
    }

    const payload = rows.map(toPayload);
    startTransition(async () => {
      const result = await createEmployees(payload);
      if (result.ok) {
        router.push("/employees");
        router.refresh();
        return;
      }
      // Map server field errors (by row index) back onto row keys.
      const serverErrors: Record<string, string> = {};
      for (const fe of result.fieldErrors ?? []) {
        const key = rows[fe.row]?.key;
        if (key) serverErrors[`${key}:${fe.field}`] = fe.message;
      }
      setErrors(serverErrors);
      expandRowsWithErrors(serverErrors);
      // Only surface a banner for genuine non-field errors; per-field messages
      // already highlight the inputs.
      setGeneralError(
        Object.keys(serverErrors).length > 0 ? null : result.error,
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {rows.map((row, i) => (
          <EmployeeCard
            key={row.key}
            row={row}
            index={i}
            reference={reference}
            errors={errors}
            collapsed={!!collapsed[row.key]}
            canRemove={rows.length > 1}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, [row.key]: !prev[row.key] }))
            }
            onChange={(patch) => update(row.key, patch)}
            onCountry={(iso2) => setCountry(row.key, iso2)}
            onRemove={() => removeRow(row.key)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xs border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-input hover:text-foreground disabled:opacity-50"
      >
        <Plus className="size-4" />
        Add another employee
      </button>

      {generalError && (
        <p className="text-sm text-destructive" role="alert">
          {generalError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/employees")}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending
            ? "Creating…"
            : `Create ${rows.length} employee${rows.length > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}

function EmployeeCard({
  row,
  index,
  reference,
  errors,
  collapsed,
  canRemove,
  onToggle,
  onChange,
  onCountry,
  onRemove,
}: {
  row: Row;
  index: number;
  reference: Reference;
  errors: Record<string, string>;
  collapsed: boolean;
  canRemove: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Row>) => void;
  onCountry: (iso2: string) => void;
  onRemove: () => void;
}) {
  const err = (field: string) => errors[`${row.key}:${field}`];
  const hasError = Object.keys(errors).some((k) =>
    k.startsWith(`${row.key}:`),
  );
  const displayName = `${row.firstName} ${row.lastName}`.trim();

  return (
    <div
      className={cn(
        "rounded-xs border bg-card p-5",
        hasError ? "border-destructive/60" : "border-border/60",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          !collapsed && "mb-4",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Avatar
            name={displayName || "New employee"}
            src={row.avatarUrl || null}
            className="size-9 rounded-xs text-xs"
          />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {displayName || `Employee ${index + 1}`}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {row.email || "No email yet"}
            </p>
          </div>
          {collapsed && hasError && (
            <span className="shrink-0 text-xs font-medium text-destructive">
              Has errors
            </span>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove employee"
              className="rounded-xs p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand" : "Collapse"}
            aria-expanded={!collapsed}
            className="rounded-xs p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {collapsed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              id={`${row.key}-first`}
              label="First name"
              required
              value={row.firstName}
              onChange={(v) => onChange({ firstName: v })}
              error={err("firstName")}
            />
            <TextField
              id={`${row.key}-last`}
              label="Last name"
              required
              value={row.lastName}
              onChange={(v) => onChange({ lastName: v })}
              error={err("lastName")}
            />
            <TextField
              id={`${row.key}-email`}
              label="Email"
              type="email"
              required
              value={row.email}
              onChange={(v) => onChange({ email: v })}
              error={err("email")}
            />

            <TextField
              id={`${row.key}-title`}
              label="Title"
              required
              value={row.title}
              onChange={(v) => onChange({ title: v })}
              error={err("title")}
            />
            <SelectField
              id={`${row.key}-level`}
              label="Level"
              required
              value={row.level}
              onChange={(v) => onChange({ level: v })}
              error={err("level")}
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              id={`${row.key}-gender`}
              label="Gender"
              required
              value={row.gender}
              onChange={(v) => onChange({ gender: v })}
              error={err("gender")}
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              id={`${row.key}-dept`}
              label="Department"
              required
              value={row.departmentId}
              onChange={(v) => onChange({ departmentId: v })}
              error={err("departmentId")}
            >
              {reference.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              id={`${row.key}-country`}
              label="Country"
              required
              value={row.countryIso2}
              onChange={(v) => onCountry(v)}
              error={err("countryIso2")}
            >
              {reference.countries.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <TextField
              id={`${row.key}-hire`}
              label="Hire date"
              type="date"
              required
              max={todayLocal()}
              value={row.hireDate}
              onChange={(v) => onChange({ hireDate: v })}
              error={err("hireDate")}
            />
            <TextField
              id={`${row.key}-dob`}
              label="Date of birth"
              type="date"
              optional
              max={todayLocal()}
              value={row.dob}
              onChange={(v) => onChange({ dob: v })}
              error={err("dob")}
            />
            <SelectField
              id={`${row.key}-mode`}
              label="Work mode"
              required
              value={row.isRemote ? "remote" : "onsite"}
              onChange={(v) => onChange({ isRemote: v === "remote" })}
            >
              <option value="onsite">On-site</option>
              <option value="remote">Remote</option>
            </SelectField>
            <SelectField
              id={`${row.key}-status`}
              label="Status"
              required
              value={row.status}
              onChange={(v) => onChange({ status: v })}
              error={err("status")}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>

            <TextField
              id={`${row.key}-avatar`}
              label="Avatar URL"
              type="url"
              optional
              placeholder="https://…"
              value={row.avatarUrl}
              onChange={(v) => onChange({ avatarUrl: v })}
              error={err("avatarUrl")}
            />
          </div>

          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Initial compensation
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField
                id={`${row.key}-currency`}
                label="Currency"
                required
                value={row.currencyCode}
                onChange={(v) => onChange({ currencyCode: v })}
                error={err("currencyCode")}
              >
                {reference.currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.name} ({c.symbol})
                  </option>
                ))}
              </SelectField>
              <SelectField
                id={`${row.key}-freq`}
                label="Pay frequency"
                required
                value={row.frequencyId}
                onChange={(v) => onChange({ frequencyId: v })}
                error={err("frequencyId")}
              >
                {reference.frequencies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </SelectField>
              <TextField
                id={`${row.key}-eff`}
                label="Effective date"
                type="date"
                optional
                max={todayLocal()}
                value={row.effectiveDate}
                onChange={(v) => onChange({ effectiveDate: v })}
                error={err("effectiveDate")}
              />
              <TextField
                id={`${row.key}-base`}
                label="Annual base pay"
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                value={row.annualBase}
                onChange={(v) => onChange({ annualBase: v })}
                error={err("annualBase")}
              />
              <TextField
                id={`${row.key}-total`}
                label="Annual total comp"
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                value={row.annualTotal}
                onChange={(v) => onChange({ annualTotal: v })}
                error={err("annualTotal")}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FieldLabel({
  id,
  label,
  required,
  optional,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="mb-1.5 block text-xs font-medium text-foreground"
    >
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
      {optional && (
        <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
      )}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  optional,
  type = "text",
  placeholder,
  max,
  min,
  step,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  optional?: boolean;
  type?: string;
  placeholder?: string;
  max?: string;
  min?: string;
  step?: string;
  inputMode?: "decimal";
}) {
  return (
    <div>
      <FieldLabel id={id} label={label} required={required} optional={optional} />
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        max={max}
        min={min}
        step={step}
        inputMode={inputMode}
        autoComplete="off"
        aria-invalid={!!error}
        className={cn(error && invalidClass, type === "number" && "tabular-nums")}
      />
      <FieldError message={error} />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel id={id} label={label} required={required} />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={cn(selectClass, error && invalidClass)}
      >
        {children}
      </select>
      <FieldError message={error} />
    </div>
  );
}
