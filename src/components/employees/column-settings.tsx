"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type {
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";

import { useUpdateEffect } from "@/hooks/use-update-effect";

import {
  ALL_IDS,
  COLUMN_COOKIE_NAME,
  DEFAULT_HIDDEN,
  DEFAULT_STATE,
  EMPLOYEE_COLUMN_META,
  LOCKED_IDS,
  type ColumnMeta,
  type LayoutState,
  isDefaultLayout,
  normalizeOrder,
  serializeColumnLayout,
} from "@/lib/employee-columns";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeCookie(state: LayoutState) {
  try {
    document.cookie = `${COLUMN_COOKIE_NAME}=${serializeColumnLayout(
      state,
    )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    // Ignore environments without document (shouldn't happen in a client comp).
  }
}

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
  initialState,
  children,
}: {
  /** Layout parsed from the cookie on the server; keeps SSR/CSR in sync. */
  initialState?: LayoutState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LayoutState>(initialState ?? DEFAULT_STATE);

  // Persist to the cookie whenever the layout changes — skipping the initial
  // render so the server-seeded layout isn't rewritten on mount. Handlers use
  // functional updates, so none of them need the latest state closed over.
  useUpdateEffect(() => writeCookie(state), [state]);

  const setOrder = useCallback((next: ColumnOrderState) => {
    setState((cur) => ({ order: normalizeOrder(next), hidden: cur.hidden }));
  }, []);

  const setVisibility = useCallback((next: VisibilityState) => {
    const hidden = EMPLOYEE_COLUMN_META.filter(
      (m) => !m.locked && next[m.id] === false,
    ).map((m) => m.id);
    setState((cur) => ({ order: cur.order, hidden }));
  }, []);

  const toggle = useCallback((id: string) => {
    if (LOCKED_IDS.has(id)) return;
    setState((cur) => {
      const hidden = cur.hidden.includes(id)
        ? cur.hidden.filter((x) => x !== id)
        : [...cur.hidden, id];
      return { order: cur.order, hidden };
    });
  }, []);

  const reorder = useCallback(
    (draggedId: string, targetId: string, position: "above" | "below") => {
      if (draggedId === targetId) return;
      if (LOCKED_IDS.has(draggedId) || LOCKED_IDS.has(targetId)) return;
      setState((cur) => {
        // Remove first, then insert relative to the target's new index so the
        // "above/below" intent maps cleanly regardless of drag direction.
        const without = cur.order.filter((id) => id !== draggedId);
        const targetIdx = without.indexOf(targetId);
        if (targetIdx < 0) return cur;
        const insertAt = position === "below" ? targetIdx + 1 : targetIdx;
        without.splice(insertAt, 0, draggedId);
        return { order: normalizeOrder(without), hidden: cur.hidden };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ order: ALL_IDS, hidden: DEFAULT_HIDDEN });
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
      isDefault: isDefaultLayout(state),
      toggle,
      reorder,
      reset,
      setOrder,
      setVisibility,
    }),
    [state, visibility, toggle, reorder, reset, setOrder, setVisibility],
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
