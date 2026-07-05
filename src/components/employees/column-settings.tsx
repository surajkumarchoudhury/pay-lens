"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";

/**
 * Column layout (order + which columns are shown) is a per-user *display*
 * preference — not part of the shareable query — so it lives in localStorage
 * rather than the URL. This module is the single source of truth for the column
 * list; the table builds its ColumnDefs against these ids and the settings
 * popover renders these labels.
 *
 * localStorage is modeled as an external store (useSyncExternalStore) so reads
 * are SSR-safe (server snapshot = defaults) without a setState-in-effect
 * hydration hack, and writes notify every subscriber (and other tabs).
 */

export type ColumnMeta = {
  id: string;
  label: string;
  /** Locked columns are always shown, pinned first, and can't be dragged. */
  locked?: boolean;
};

export const EMPLOYEE_COLUMN_META: ColumnMeta[] = [
  { id: "name", label: "Employee", locked: true },
  { id: "title", label: "Title" },
  { id: "level", label: "Level" },
  { id: "department", label: "Department" },
  { id: "country", label: "Country" },
  { id: "hireDate", label: "Hire date" },
  { id: "effectiveDate", label: "Effective date" },
  { id: "salary", label: "Annual base" },
  { id: "totalComp", label: "Total comp" },
  { id: "compa", label: "Compa-ratio" },
  { id: "isRemote", label: "Work mode" },
  { id: "status", label: "Status" },
];

const ALL_IDS = EMPLOYEE_COLUMN_META.map((m) => m.id);
const LOCKED_IDS = new Set(
  EMPLOYEE_COLUMN_META.filter((m) => m.locked).map((m) => m.id),
);
const STORAGE_KEY = "paylens.employees.columns.v1";

type LayoutState = { order: string[]; hidden: string[] };

// Columns hidden out of the box to keep the default view focused; users can
// switch them on via the "Columns" popover (choice persists in localStorage).
const DEFAULT_HIDDEN = ["hireDate", "effectiveDate", "isRemote", "compa"];

const DEFAULT_STATE: LayoutState = { order: ALL_IDS, hidden: DEFAULT_HIDDEN };

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** Keep locked columns first, then the given order, dropping/adding as needed. */
function normalizeOrder(order: string[]): string[] {
  const known = order.filter((id) => ALL_IDS.includes(id));
  const merged = [...known, ...ALL_IDS.filter((id) => !known.includes(id))];
  const locked = merged.filter((id) => LOCKED_IDS.has(id));
  const rest = merged.filter((id) => !LOCKED_IDS.has(id));
  return [...locked, ...rest];
}

function sanitizeHidden(hidden: string[]): string[] {
  return hidden.filter((id) => ALL_IDS.includes(id) && !LOCKED_IDS.has(id));
}

// ── External store backed by localStorage ──────────────────────────────────

let cache: LayoutState | null = null;
const listeners = new Set<() => void>();

function readStorage(): LayoutState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LayoutState>;
      cache = {
        order: normalizeOrder(parsed.order ?? ALL_IDS),
        hidden: sanitizeHidden(parsed.hidden ?? []),
      };
      return cache;
    }
  } catch {
    // Corrupt/unavailable storage → fall back to defaults.
  }
  cache = DEFAULT_STATE;
  return cache;
}

function writeStorage(next: LayoutState) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private-mode failures.
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null; // force re-read from the updated value
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// getSnapshot must return a stable reference while unchanged, else React loops.
const getSnapshot = () => readStorage();
const getServerSnapshot = () => DEFAULT_STATE;

// ── Context ─────────────────────────────────────────────────────────────────

type ColumnSettingsValue = {
  meta: ColumnMeta[];
  order: ColumnOrderState;
  visibility: VisibilityState;
  hiddenCount: number;
  isDefault: boolean;
  toggle: (id: string) => void;
  reorder: (
    draggedId: string,
    targetId: string,
    position: "above" | "below",
  ) => void;
  reset: () => void;
  /** Handlers so the table's controlled state can round-trip through here. */
  setOrder: (next: ColumnOrderState) => void;
  setVisibility: (next: VisibilityState) => void;
};

const ColumnSettingsContext = createContext<ColumnSettingsValue | null>(null);

export function ColumnSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setOrder = useCallback((next: ColumnOrderState) => {
    writeStorage({ order: normalizeOrder(next), hidden: readStorage().hidden });
  }, []);

  const setVisibility = useCallback((next: VisibilityState) => {
    const hidden = EMPLOYEE_COLUMN_META.filter(
      (m) => !m.locked && next[m.id] === false,
    ).map((m) => m.id);
    writeStorage({ order: readStorage().order, hidden });
  }, []);

  const toggle = useCallback((id: string) => {
    if (LOCKED_IDS.has(id)) return;
    const cur = readStorage();
    const hidden = cur.hidden.includes(id)
      ? cur.hidden.filter((x) => x !== id)
      : [...cur.hidden, id];
    writeStorage({ order: cur.order, hidden });
  }, []);

  const reorder = useCallback(
    (draggedId: string, targetId: string, position: "above" | "below") => {
      if (draggedId === targetId) return;
      if (LOCKED_IDS.has(draggedId) || LOCKED_IDS.has(targetId)) return;
      const cur = readStorage();
      // Remove first, then insert relative to the target's new index so the
      // "above/below" intent maps cleanly regardless of drag direction.
      const without = cur.order.filter((id) => id !== draggedId);
      const targetIdx = without.indexOf(targetId);
      if (targetIdx < 0) return;
      const insertAt = position === "below" ? targetIdx + 1 : targetIdx;
      without.splice(insertAt, 0, draggedId);
      writeStorage({ order: normalizeOrder(without), hidden: cur.hidden });
    },
    [],
  );

  const reset = useCallback(() => {
    writeStorage({ order: ALL_IDS, hidden: DEFAULT_HIDDEN });
  }, []);

  const visibility = useMemo<VisibilityState>(() => {
    const v: VisibilityState = {};
    for (const m of EMPLOYEE_COLUMN_META) {
      v[m.id] = m.locked ? true : !state.hidden.includes(m.id);
    }
    return v;
  }, [state.hidden]);

  const value = useMemo<ColumnSettingsValue>(
    () => ({
      meta: EMPLOYEE_COLUMN_META,
      order: state.order,
      visibility,
      hiddenCount: state.hidden.length,
      isDefault:
        sameSet(state.hidden, DEFAULT_HIDDEN) &&
        state.order.length === ALL_IDS.length &&
        state.order.every((id, i) => id === ALL_IDS[i]),
      toggle,
      reorder,
      reset,
      setOrder,
      setVisibility,
    }),
    [state.order, state.hidden, visibility, toggle, reorder, reset, setOrder, setVisibility],
  );

  return (
    <ColumnSettingsContext.Provider value={value}>
      {children}
    </ColumnSettingsContext.Provider>
  );
}

export function useColumnSettings(): ColumnSettingsValue {
  const ctx = useContext(ColumnSettingsContext);
  if (!ctx) {
    throw new Error(
      "useColumnSettings must be used within a ColumnSettingsProvider",
    );
  }
  return ctx;
}
