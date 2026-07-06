"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";

import { useColumnSettings } from "@/components/employees/column-settings";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Column manager: an icon that opens a popover (not a modal) where columns can
 * be toggled on/off and dragged to reorder. Changes apply live and persist via
 * the ColumnSettings context. The locked column (Employee) stays pinned first.
 */
export function ColumnSettingsButton() {
  const { meta, order, visibility, isDefault, toggle, reorder, reset } =
    useColumnSettings();

  const [open, setOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"above" | "below">("above");

  const clearDrag = () => {
    setDraggingId(null);
    setOverId(null);
  };

  const labelOf = (id: string) => meta.find((m) => m.id === id)?.label ?? id;
  const isLocked = (id: string) => meta.find((m) => m.id === id)?.locked ?? false;

  // Render rows in the current column order.
  const rows = order.map((id) => ({
    id,
    label: labelOf(id),
    locked: isLocked(id),
    visible: visibility[id] !== false,
  }));

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip label="Manage columns">
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="Manage columns"
            className={cn(
              "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xs border transition-colors",
              !isDefault
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input text-foreground hover:bg-muted",
            )}
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-72 rounded-md bg-popover p-3 text-popover-foreground shadow-md focus-visible:outline-none"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Columns</span>
            <button
              type="button"
              onClick={reset}
              disabled={isDefault}
              className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          </div>

          <div className="space-y-0.5">
            {rows.map((row) => {
              const showLine = overId === row.id && draggingId !== row.id;
              return (
                <div
                  key={row.id}
                  draggable={!row.locked}
                  onDragStart={(e) => {
                    if (row.locked) return;
                    setDraggingId(row.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (row.locked || !draggingId) return;
                    e.preventDefault();
                    // Top half → drop above this row, bottom half → below. We
                    // only paint an edge line; rows never shift while dragging.
                    const rect = e.currentTarget.getBoundingClientRect();
                    const below = e.clientY > rect.top + rect.height / 2;
                    setOverId(row.id);
                    setDropPosition(below ? "below" : "above");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingId && !row.locked) {
                      reorder(draggingId, row.id, dropPosition);
                    }
                    clearDrag();
                  }}
                  onDragEnd={clearDrag}
                  className={cn(
                    "relative flex items-center gap-2 rounded-sm px-1 py-1.5 transition-colors",
                    draggingId === row.id && "opacity-40",
                  )}
                >
                  {showLine && (
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-primary",
                        dropPosition === "above" ? "-top-px" : "-bottom-px",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "grid size-5 place-items-center text-muted-foreground",
                      row.locked ? "cursor-not-allowed opacity-30" : "cursor-grab active:cursor-grabbing",
                    )}
                    aria-hidden
                  >
                    <GripVertical className="size-4" />
                  </span>

                  <span
                    className={cn(
                      "flex-1 truncate text-sm",
                      row.locked && "text-muted-foreground",
                    )}
                  >
                    {row.label}
                  </span>

                  <Switch
                    checked={row.visible}
                    disabled={row.locked}
                    onCheckedChange={() => toggle(row.id)}
                    label={`Toggle ${row.label}`}
                  />
                </div>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Switch({
  checked,
  disabled,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onCheckedChange}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
