"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { StatusBadge, WorkModeBadge } from "@/components/employees/badges";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { updateEmployeeProfile } from "@/app/(authenticated)/employees/[id]/actions";
import { formatLongDate, formatTenure, todayLocal } from "@/lib/date";
import { GENDER_OPTIONS } from "@/lib/employee-gender";
import { LEVEL_OPTIONS } from "@/lib/employee-level";
import { validateEmployeeProfile } from "@/lib/employee-schema";
import { STATUS_OPTIONS } from "@/lib/employee-status";
import { cn } from "@/lib/utils";

export type EmployeeProfile = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  gender: string;
  title: string;
  level: string;
  status: string;
  isRemote: boolean;
  hireDate: string; // ISO
  dob: string | null; // ISO
  department: string;
  departmentId: string;
  country: string;
  countryIso2: string;
};

type Reference = {
  departments: { id: string; name: string }[];
  countries: { iso2: string; name: string }[];
};

const selectClass =
  "flex h-10 w-full cursor-pointer rounded-xs border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const invalidClass =
  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30";

function genderLabel(id: string): string {
  return GENDER_OPTIONS.find((o) => o.value === id)?.label ?? id;
}

export function EmployeeProfileCard({
  employee,
  reference,
  canEdit,
}: {
  employee: EmployeeProfile;
  reference: Reference;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xs border border-border/60 bg-card">
        <EditForm
          employee={employee}
          reference={reference}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  const facts: { label: string; value: string }[] = [
    { label: "Employee ID", value: employee.employeeNumber },
    { label: "Department", value: employee.department },
    { label: "Country", value: employee.country },
    { label: "Hire date", value: formatLongDate(employee.hireDate) },
    { label: "Tenure", value: formatTenure(employee.hireDate) },
    { label: "Gender", value: genderLabel(employee.gender) },
    ...(employee.dob
      ? [{ label: "Date of birth", value: formatLongDate(employee.dob) }]
      : []),
  ];

  return (
    <div className="relative rounded-xs border border-border/60 bg-card p-5">
      {canEdit && (
        <Tooltip label="Edit profile">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit profile"
            className="absolute right-3 top-3 rounded-xs p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
        </Tooltip>
      )}

      <Avatar
        name={`${employee.firstName} ${employee.lastName}`}
        src={employee.avatarUrl}
        className="size-20 rounded-xs text-2xl"
      />
      <h1 className="mt-4 text-lg font-semibold leading-tight text-foreground">
        {employee.firstName} {employee.lastName}
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">{employee.title}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {employee.level}
        </span>
        <StatusBadge status={employee.status as never} />
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

function EditForm({
  employee,
  reference,
  onDone,
}: {
  employee: EmployeeProfile;
  reference: Reference;
  onDone: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    gender: employee.gender,
    title: employee.title,
    level: employee.level,
    status: employee.status,
    isRemote: employee.isRemote,
    countryIso2: employee.countryIso2,
    departmentId: employee.departmentId,
    hireDate: employee.hireDate.slice(0, 10),
    dob: employee.dob ? employee.dob.slice(0, 10) : "",
    avatarUrl: employee.avatarUrl ?? "",
  });
  // Keyed by field name (matches the Zod schema keys).
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear the error for a field as soon as it's edited.
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function submit() {
    setGeneralError(null);
    const payload = { employeeId: employee.id, ...form };

    // Client-side validation with the shared Zod schema (instant field errors).
    const clientErrors = validateEmployeeProfile(payload);
    if (clientErrors) {
      setErrors(clientErrors);
      return;
    }

    startTransition(async () => {
      const result = await updateEmployeeProfile(payload);
      if (result.ok) {
        onDone();
        router.refresh();
        return;
      }
      const serverErrors: Record<string, string> = {};
      for (const fe of result.fieldErrors ?? []) {
        serverErrors[fe.field] = fe.message;
      }
      setErrors(serverErrors);
      // Only surface a banner for genuine non-field errors.
      setGeneralError(
        Object.keys(serverErrors).length > 0 ? null : result.error,
      );
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <div className="flex flex-col items-center gap-3">
          <Avatar
            name={`${form.firstName} ${form.lastName}`.trim() || "Employee"}
            src={form.avatarUrl || null}
            className="size-20 rounded-xs text-2xl"
          />
          <TextField
            id="ep-avatar"
            label="Avatar URL"
            type="url"
            optional
            placeholder="https://…"
            value={form.avatarUrl}
            onChange={(v) => set("avatarUrl", v)}
            error={errors.avatarUrl}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="ep-first"
            label="First name"
            required
            value={form.firstName}
            onChange={(v) => set("firstName", v)}
            error={errors.firstName}
          />
          <TextField
            id="ep-last"
            label="Last name"
            required
            value={form.lastName}
            onChange={(v) => set("lastName", v)}
            error={errors.lastName}
          />
        </div>
        <TextField
          id="ep-email"
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(v) => set("email", v)}
          error={errors.email}
        />
        <TextField
          id="ep-title"
          label="Title"
          required
          value={form.title}
          onChange={(v) => set("title", v)}
          error={errors.title}
        />

        <SelectField
          id="ep-level"
          label="Level"
          required
          value={form.level}
          onChange={(v) => set("level", v)}
          error={errors.level}
        >
          {LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="ep-gender"
          label="Gender"
          required
          value={form.gender}
          onChange={(v) => set("gender", v)}
          error={errors.gender}
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            id="ep-dept"
            label="Department"
            required
            value={form.departmentId}
            onChange={(v) => set("departmentId", v)}
            error={errors.departmentId}
          >
            {reference.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="ep-country"
            label="Country"
            required
            value={form.countryIso2}
            onChange={(v) => set("countryIso2", v)}
            error={errors.countryIso2}
          >
            {reference.countries.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="ep-hire"
            label="Hire date"
            type="date"
            required
            max={todayLocal()}
            value={form.hireDate}
            onChange={(v) => set("hireDate", v)}
            error={errors.hireDate}
          />
          <TextField
            id="ep-dob"
            label="Date of birth"
            type="date"
            optional
            max={todayLocal()}
            value={form.dob}
            onChange={(v) => set("dob", v)}
            error={errors.dob}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            id="ep-mode"
            label="Work mode"
            required
            value={form.isRemote ? "remote" : "onsite"}
            onChange={(v) => set("isRemote", v === "remote")}
          >
            <option value="onsite">On-site</option>
            <option value="remote">Remote</option>
          </SelectField>
          <SelectField
            id="ep-status"
            label="Status"
            required
            value={form.status}
            onChange={(v) => set("status", v)}
            error={errors.status}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="border-t border-border/60 bg-card p-4">
        {generalError && (
          <p className="mb-3 text-sm text-destructive" role="alert">
            {generalError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDone}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
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
        <span className="ml-1 font-normal text-muted-foreground">
          (optional)
        </span>
      )}
    </label>
  );
}

function FieldErrorText({ message }: { message?: string }) {
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
}) {
  return (
    <div className="w-full">
      <FieldLabel id={id} label={label} required={required} optional={optional} />
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        max={max}
        autoComplete="off"
        aria-invalid={!!error}
        className={cn(error && invalidClass)}
      />
      <FieldErrorText message={error} />
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
    <div className="w-full">
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
      <FieldErrorText message={error} />
    </div>
  );
}
