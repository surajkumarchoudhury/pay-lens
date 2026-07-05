"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";

import { STATUS_OPTIONS, type EmployeeStatusId } from "@/lib/employee-status";
import { cn } from "@/lib/utils";

export function StatusFilter({ value }: { value: EmployeeStatusId[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EmployeeStatusId[]>(value);

  const isActive = value.length > 0;

  const toggle = (id: EmployeeStatusId) =>
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const onApply = () => {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (draft.length) params.set("status", draft.join(","));
    else params.delete("status");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        // Re-sync the draft with the applied  each time we open.
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
          <span className={isActive ? "font-medium" : "text-muted-foreground"}>
            Status
          </span>
          {isActive && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {value.length}
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-56 rounded-md bg-popover p-3 text-popover-foreground shadow-md focus-visible:outline-none"
        >
          <div className="mb-3 text-sm font-semibold">Status</div>
          <div className="space-y-1">
            {STATUS_OPTIONS.map((o) => {
              const checked = draft.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(o.value)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1.5 text-sm transition-colors hover:bg-muted"
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
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
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
