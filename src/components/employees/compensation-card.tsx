"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { CompaBadge } from "@/components/employees/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { recordCompensationChange } from "@/app/(authenticated)/employees/[id]/actions";
import { formatMoney } from "@/lib/money";
import { bandPlacement, compaRatio, type Level } from "@/lib/salary-bands";
import type { BandPlacement } from "@/lib/salary-bands";
import { cn } from "@/lib/utils";

export type CurrentCompensation = {
  baseLocal: number;
  baseUsd: number;
  totalLocal: number;
  totalUsd: number;
  compaRatio: number | null;
  bandPlacement: BandPlacement | null;
  frequencyLabel: string;
  effectiveDate: string; // ISO
  currencyCode: string;
  currencySymbol: string;
};

/** Today as YYYY-MM-DD in local time, for the date input default. */
function todayLocal(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Current-compensation card. For HR managers a pencil flips it into an inline
 * edit form (pre-populated), which records a *new* salary record via the server
 * action — the existing record is retired into history. No modal: editing
 * happens in place with Save / Cancel at the bottom.
 */
export function CompensationCard({
  employeeId,
  level,
  countryIso2,
  rateToUsd,
  version,
  canEdit,
  current,
}: {
  employeeId: string;
  level: Level;
  countryIso2: string;
  rateToUsd: number;
  version: number;
  canEdit: boolean;
  current: CurrentCompensation;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">
          Current compensation
        </h2>
        {canEdit && !editing && (
          <Tooltip label="Edit compensation">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit compensation"
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
            employeeId={employeeId}
            level={level}
            countryIso2={countryIso2}
            rateToUsd={rateToUsd}
            version={version}
            current={current}
            onDone={() => setEditing(false)}
          />
        ) : (
          <ReadView current={current} />
        )}
      </div>
    </div>
  );
}

function ReadView({ current }: { current: CurrentCompensation }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Metric label="Annual base">
          <Money
            local={current.baseLocal}
            usd={current.baseUsd}
            code={current.currencyCode}
          />
        </Metric>
        <Metric label="Total comp">
          <Money
            local={current.totalLocal}
            usd={current.totalUsd}
            code={current.currencyCode}
          />
        </Metric>
        <Metric label="Compa-ratio">
          <CompaBadge
            ratio={current.compaRatio}
            placement={current.bandPlacement}
          />
        </Metric>
        <Metric label="Pay frequency">
          <span className="text-sm text-foreground">
            {current.frequencyLabel}
          </span>
        </Metric>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Effective {formatFullDate(current.effectiveDate)}
      </p>
    </>
  );
}

function EditForm({
  employeeId,
  level,
  countryIso2,
  rateToUsd,
  version,
  current,
  onDone,
}: {
  employeeId: string;
  level: Level;
  countryIso2: string;
  rateToUsd: number;
  version: number;
  current: CurrentCompensation;
  onDone: () => void;
}) {
  const [base, setBase] = useState(String(Math.round(current.baseLocal)));
  const [total, setTotal] = useState(String(Math.round(current.totalLocal)));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const baseNum = Number(base);
  const ratio =
    baseNum > 0 ? compaRatio(baseNum * rateToUsd, level, countryIso2) : null;
  const placement = ratio != null ? bandPlacement(ratio) : null;
  const deltaPct =
    current.baseLocal > 0 && baseNum > 0
      ? Math.round(((baseNum - current.baseLocal) / current.baseLocal) * 1000) /
        10
      : null;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await recordCompensationChange(
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
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="expectedVersion" value={version} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AmountField
          label="Annual base pay"
          name="annualBase"
          symbol={current.currencySymbol}
          code={current.currencyCode}
          value={base}
          onChange={setBase}
        />
        <AmountField
          label="Annual total comp"
          name="annualTotal"
          symbol={current.currencySymbol}
          code={current.currencyCode}
          value={total}
          onChange={setTotal}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <label
            htmlFor="effectiveDate"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Effective date
          </label>
          <Input
            id="effectiveDate"
            name="effectiveDate"
            type="date"
            defaultValue={todayLocal()}
            className="w-44"
          />
        </div>

        {/* Live preview of the resulting band position + change vs. current. */}
        <div className="flex items-center gap-3 rounded-xs bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">New compa-ratio</span>
          {deltaPct != null && deltaPct !== 0 && (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                deltaPct > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {deltaPct > 0 ? "+" : ""}
              {deltaPct}% base
            </span>
          )}
          <CompaBadge ratio={ratio} placement={placement} />
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
          {pending ? "Saving…" : "Save change"}
        </Button>
      </div>
    </form>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Money({
  local,
  usd,
  code,
}: {
  local: number;
  usd: number;
  code: string;
}) {
  return (
    <div>
      <div className="font-medium tabular-nums text-foreground">
        {formatMoney(local, code)}
      </div>
      {code !== "USD" && (
        <div className="text-xs tabular-nums text-muted-foreground">
          {formatMoney(usd, "USD")} USD
        </div>
      )}
    </div>
  );
}

function AmountField({
  label,
  name,
  symbol,
  code,
  value,
  onChange,
}: {
  label: string;
  name: string;
  symbol: string;
  code: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-xs font-medium text-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {symbol}
        </span>
        <Input
          id={name}
          name={name}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-8 pr-14 tabular-nums"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {code}
        </span>
      </div>
    </div>
  );
}
