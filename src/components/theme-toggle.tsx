"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className={cn("[&_svg]:size-5", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="hidden [html.dark_&]:block" />
      <Moon className="block [html.dark_&]:hidden" />
    </Button>
  );
}
