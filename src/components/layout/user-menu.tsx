"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut } from "lucide-react";

import { logout } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/session";
import { initials } from "@/lib/utils";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  HR_MANAGER: "HR Manager",
  VIEWER: "Read-only",
};

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/15 text-xs font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none"
        >
          {initials(user.name)}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-64 rounded-md bg-popover p-2 text-popover-foreground shadow-md focus-visible:outline-none"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium text-foreground">
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {ROLE_LABEL[user.role]} · {user.email}
              </div>
            </div>
          </div>

          <DropdownMenu.Item
            onSelect={() => {
              void logout();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:text-primary data-highlighted:text-primary"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
