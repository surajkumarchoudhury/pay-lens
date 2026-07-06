"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type PageItem = number | "ellipsis-left" | "ellipsis-right";

/**
 * Build the page list: always show first + last, a window of `siblings` pages
 * either side of the current page, and an ellipsis where there is a gap.
 */
function pageItems(
  current: number,
  total: number,
  siblings = 1,
): PageItem[] {
  // first, last, current, 2 ellipses, and 2*siblings neighbours
  const slots = siblings * 2 + 5;
  if (total <= slots) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeft = left > 2;
  const showRight = right < total - 1;

  const items: PageItem[] = [1];
  if (showLeft) items.push("ellipsis-left");
  else for (let p = 2; p < left; p++) items.push(p);

  for (let p = left; p <= right; p++) {
    if (p !== 1 && p !== total) items.push(p);
  }

  if (showRight) items.push("ellipsis-right");
  else for (let p = right + 1; p < total; p++) items.push(p);

  items.push(total);
  return items;
}

/**
 * Presentational pager. It knows nothing about URLs — it just reports the
 * requested page via `onPageChange` and lets the caller decide what that means
 * (navigate, refetch, etc.). Uses buttons rather than anchors so there's no
 * href preview in the status bar. `isPending` disables interaction while the
 * caller is applying the change.
 */
export function Pagination({
  page,
  pageSize,
  total,
  pageCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  isPending = false,
  noun = "employees",
}: {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: readonly number[];
  isPending?: boolean;
  /** Plural noun for the "of N …" label (e.g. "employees", "changes"). */
  noun?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const isFirst = page <= 1;
  const isLast = page >= pageCount;

  const arrowClass = cn(
    "grid size-8 cursor-pointer place-items-center rounded-xs border border-input text-foreground transition-colors hover:bg-muted",
    "disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent",
  );

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="flex items-center text-sm text-muted-foreground">
        Showing&nbsp;<span className="font-medium text-foreground">{from}</span>–
        <PageSizeSelect
          displayValue={to}
          value={pageSize}
          options={pageSizeOptions}
          onChange={onPageSizeChange}
          disabled={isPending}
        />
        &nbsp;of&nbsp;
        <span className="font-medium text-foreground">{total}</span>
        &nbsp;{noun}
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          className={arrowClass}
          aria-label="Previous page"
          disabled={isFirst || isPending}
        >
          <ChevronLeft className="size-4" />
        </button>

        {pageItems(page, pageCount).map((item) =>
          typeof item === "number" ? (
            item === page ? (
              <span
                key={item}
                aria-current="page"
                className="grid size-8 place-items-center rounded-xs bg-primary text-sm font-medium text-primary-foreground tabular-nums"
              >
                {item}
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                disabled={isPending}
                className="grid size-8 cursor-pointer place-items-center rounded-xs text-sm text-foreground tabular-nums transition-colors hover:bg-muted disabled:cursor-default"
              >
                {item}
              </button>
            )
          ) : (
            <span
              key={item}
              className="grid size-8 place-items-center text-sm text-muted-foreground"
            >
              …
            </span>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          className={arrowClass}
          aria-label="Next page"
          disabled={isLast || isPending}
        >
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}

/**
 * Inline "rows per page" picker. Renders as the range-end number in the
 * "Showing …" sentence (`displayValue`) with a chevron, so it reads as plain
 * text but opens a size menu. The checked option is the actual `pageSize`.
 */
function PageSizeSelect({
  displayValue,
  value,
  options,
  onChange,
  disabled,
}: {
  displayValue: number;
  value: number;
  options: readonly number[];
  onChange: (size: number) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Rows per page"
          className="inline-flex cursor-pointer items-center gap-0.5 rounded-xs font-medium text-foreground tabular-nums transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-default disabled:opacity-60"
        >
          {displayValue}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-16 rounded-md bg-popover p-1 text-popover-foreground shadow-md focus-visible:outline-none"
        >
          <DropdownMenu.RadioGroup
            value={String(value)}
            onValueChange={(v) => onChange(Number(v))}
          >
            {options.map((o) => (
              <DropdownMenu.RadioItem
                key={o}
                value={String(o)}
                className="flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pl-2 pr-3 text-sm tabular-nums outline-none transition-colors data-highlighted:bg-muted"
              >
                <span className="grid w-4 shrink-0 place-items-center">
                  <DropdownMenu.ItemIndicator>
                    <Check className="size-3.5 text-primary" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {o}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
