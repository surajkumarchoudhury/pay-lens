"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { updateOrganization } from "@/app/(authenticated)/settings/organization/actions";
import type { CurrencyOption } from "@/lib/employees";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  baseCurrency: string;
  employeeCount: number;
  departmentCount: number;
  createdAt: string; // ISO
  currencies: CurrencyOption[];
  canEdit: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function currencyLabel(currencies: CurrencyOption[], code: string): string {
  const c = currencies.find((x) => x.code === code);
  return c ? `${c.code} · ${c.name} (${c.symbol})` : code;
}

/**
 * Organization profile card. For HR managers a pencil flips it into an inline
 * edit form (name + reporting/base currency); the change persists via the
 * server action and is recorded in the audit trail. Viewers see read-only.
 */
export function OrganizationProfileCard({
  name,
  baseCurrency,
  employeeCount,
  departmentCount,
  createdAt,
  currencies,
  canEdit,
}: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">
          Organization profile
        </h2>
        {canEdit && !editing && (
          <Tooltip label="Edit organization">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit organization"
              className="rounded-xs p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="rounded-xs border border-border/60 bg-card p-6">
        {editing ? (
          <EditForm
            name={name}
            baseCurrency={baseCurrency}
            currencies={currencies}
            onDone={() => setEditing(false)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Organization name" value={name} />
            <Field
              label="Base currency"
              value={currencyLabel(currencies, baseCurrency)}
              hint="Reporting currency for normalized figures"
            />
            <Field label="Employees" value={employeeCount.toLocaleString("en-US")} />
            <Field
              label="Departments"
              value={departmentCount.toLocaleString("en-US")}
            />
            <Field label="Created" value={formatDate(createdAt)} />
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function EditForm({
  name: initialName,
  baseCurrency: initialCurrency,
  currencies,
  onDone,
}: {
  name: string;
  baseCurrency: string;
  currencies: CurrencyOption[];
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [baseCurrency, setBaseCurrency] = useState(initialCurrency);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updateOrganization(
        { ok: false, error: null },
        formData,
      );
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="org-name"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Organization name
          </label>
          <Input
            id="org-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="off"
          />
        </div>

        <div>
          <label
            htmlFor="org-currency"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Base currency
          </label>
          <select
            id="org-currency"
            name="baseCurrency"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className={cn(
              "flex h-10 w-full cursor-pointer rounded-xs border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            )}
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name} ({c.symbol})
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Used as the reporting currency for cross-currency figures.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
