"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Minimal in-house theme provider (class-based dark mode on <html>). Replaces
 * next-themes, whose inline anti-flash <script> trips React 19's "script tag
 * while rendering" check. The anti-flash script now lives in the root layout
 * (server-rendered, so it executes without that warning); this provider only
 * owns the React state + toggling. Preference persists in localStorage.
 */

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (next: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function getSystemDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers read localStorage / matchMedia only on the client. The
  // provider renders no theme-dependent DOM itself, so there's no SSR mismatch.
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemDark, setSystemDark] = useState<boolean>(getSystemDark);

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Sync the DOM with the resolved theme (external write, not state).
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Follow OS preference changes while on "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore private-mode / quota failures.
    }
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
