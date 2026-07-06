"use client";

import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

/**
 * Lightweight hover/focus tooltip. Bundles its own Provider so it can be dropped
 * in anywhere without a top-level provider. Pass a trigger element as children
 * (it's cloned via `asChild`, so it must forward refs/props — most DOM elements
 * and Radix triggers do).
 */
export function Tooltip({
  label,
  children,
  side = "top",
  sideOffset = 6,
  delayDuration = 200,
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            className="z-50 select-none rounded-xs bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md"
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-foreground" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
