"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { updateOrganization } from "@/app/(authenticated)/settings/organization/actions";
import { formatLongDate } from "@/lib/date";
import type { CurrencyOption } from "@/lib/employees";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl: string | null;
  baseCurrency: string;
  employeeCount: number;
  departmentCount: number;
  createdAt: string; // ISO
  currencies: CurrencyOption[];
  canEdit: boolean;
};

/** Compact base-currency label for the pill, e.g. "USD ($)". */
function compactCurrency(currencies: CurrencyOption[], code: string): string {
  const c = currencies.find((x) => x.code === code);
  return c ? `${c.code} (${c.symbol})` : code;
}

/**
 * Organization profile card. For HR managers a pencil flips it into an inline
 * edit form (name + reporting/base currency); the change persists via the
 * server action and is recorded in the audit trail. Viewers see read-only.
 */
export function OrganizationProfileCard({
  name,
  avatarUrl,
  baseCurrency,
  employeeCount,
  departmentCount,
  createdAt,
  currencies,
  canEdit,
}: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="relative rounded-xs border border-border/60 bg-card p-5">
      {canEdit && !editing && (
        <Tooltip label="Edit organization">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit organization"
            className="absolute right-3 top-3 rounded-xs p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
        </Tooltip>
      )}

      {editing ? (
        <EditForm
          name={name}
          avatarUrl={avatarUrl}
          baseCurrency={baseCurrency}
          currencies={currencies}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <Avatar
            name={name}
            src={avatarUrl}
            className="size-20 rounded-xs text-2xl"
          />
          <h2 className="mt-4 text-lg font-semibold leading-tight text-foreground">
            {name}
          </h2>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              Base currency · {compactCurrency(currencies, baseCurrency)}
            </span>
          </div>

          <div className="my-4 border-t border-border/60" />

          <dl className="space-y-0.5">
            <InfoRow
              label="Employees"
              value={employeeCount.toLocaleString("en-US")}
            />
            <InfoRow
              label="Departments"
              value={departmentCount.toLocaleString("en-US")}
            />
            <InfoRow label="Created" value={formatLongDate(createdAt)} />
          </dl>
        </>
      )}
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
  name: initialName,
  avatarUrl: initialAvatarUrl,
  baseCurrency: initialCurrency,
  currencies,
  onDone,
}: {
  name: string;
  avatarUrl: string | null;
  baseCurrency: string;
  currencies: CurrencyOption[];
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
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
      <div className="flex flex-col items-center gap-3">
        <Avatar
          name={name || "Organization"}
          src={avatarUrl || null}
          className="size-20 rounded-xs text-2xl"
        />
        <div className="w-full">
          <label
            htmlFor="org-avatar"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Logo URL
          </label>
          <Input
            id="org-avatar"
            name="avatarUrl"
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Leave blank to use the name initials.
          </p>
        </div>
      </div>

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
