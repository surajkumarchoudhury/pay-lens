"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, ListFilter } from "lucide-react";

import { GENDER_OPTIONS, type GenderId } from "@/lib/employee-gender";
import { LEVEL_OPTIONS, type EmployeeLevelId } from "@/lib/employee-level";
import { STATUS_OPTIONS, type EmployeeStatusId } from "@/lib/employee-status";
import { WORK_MODE_OPTIONS, type WorkModeId } from "@/lib/employee-work-mode";
import { cn } from "@/lib/utils";

export type AttributeValues = {
  levels: EmployeeLevelId[];
  statuses: EmployeeStatusId[];
  genders: GenderId[];
  workMode: WorkModeId | null;
};

export function AttributesFilter({ value }: { value: AttributeValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AttributeValues>(value);

  const activeCount =
    value.levels.length +
    value.statuses.length +
    value.genders.length +
    (value.workMode ? 1 : 0);
  const isActive = activeCount > 0;

  const draftCount =
    draft.levels.length +
    draft.statuses.length +
    draft.genders.length +
    (draft.workMode ? 1 : 0);

  const toggleMulti = <T extends string>(key: keyof AttributeValues, id: T) =>
    setDraft((prev) => {
      const list = prev[key] as T[];
      const next = list.includes(id)
        ? list.filter((x) => x !== id)
        : [...list, id];
      return { ...prev, [key]: next };
    });

  const setWorkMode = (id: WorkModeId) =>
    setDraft((prev) => ({
      ...prev,
      workMode: prev.workMode === id ? null : id,
    }));

  const clearDraft = () =>
    setDraft({ levels: [], statuses: [], genders: [], workMode: null });

  const onApply = () => {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    setParam(params, "level", draft.levels.join(","));
    setParam(params, "status", draft.statuses.join(","));
    setParam(params, "gender", draft.genders.join(","));
    setParam(params, "mode", draft.workMode ?? "");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        // Re-sync the draft with the applied value each time we open.
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xs border px-3 text-sm transition-colors",
            isActive
              ? "border-primary bg-primary/10 text-foreground"
              : "border-input text-foreground hover:bg-muted",
          )}
        >
          <ListFilter className="size-4 text-muted-foreground" />
          <span className={isActive ? "font-medium" : "text-muted-foreground"}>
            Attributes
          </span>
          {isActive && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[420px] rounded-md bg-popover p-4 text-popover-foreground shadow-md focus-visible:outline-none"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Attributes</span>
            {draftCount > 0 && (
              <button
                type="button"
                onClick={clearDraft}
                className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex gap-6">
            <Section title="Level" className="w-1/2">
              {LEVEL_OPTIONS.map((o) => (
                <CheckRow
                  key={o.value}
                  label={o.label}
                  checked={draft.levels.includes(o.value)}
                  onClick={() => toggleMulti("levels", o.value)}
                />
              ))}
            </Section>

            <div className="w-1/2 space-y-4">
              <Section title="Status">
                {STATUS_OPTIONS.map((o) => (
                  <CheckRow
                    key={o.value}
                    label={o.label}
                    checked={draft.statuses.includes(o.value)}
                    onClick={() => toggleMulti("statuses", o.value)}
                  />
                ))}
              </Section>

              <Section title="Work mode">
                {WORK_MODE_OPTIONS.map((o) => (
                  <CheckRow
                    key={o.value}
                    label={o.label}
                    checked={draft.workMode === o.value}
                    onClick={() => setWorkMode(o.value)}
                  />
                ))}
              </Section>
            </div>
          </div>

          <Section title="Gender" className="mt-4">
            <div className="grid grid-cols-2">
              {GENDER_OPTIONS.map((o) => (
                <CheckRow
                  key={o.value}
                  label={o.label}
                  checked={draft.genders.includes(o.value)}
                  onClick={() => toggleMulti("genders", o.value)}
                />
              ))}
            </div>
          </Section>

          <div className="mt-4 flex justify-end border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={onApply}
              className="inline-flex h-8 cursor-pointer items-center rounded-xs bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Apply
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-2 text-sm font-semibold text-foreground">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1.5 text-left text-sm transition-colors hover:bg-muted"
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-[4px] border",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input",
        )}
      >
        {checked && <Check className="size-4" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Set or delete a URL param based on whether the value is non-empty. */
function setParam(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}
