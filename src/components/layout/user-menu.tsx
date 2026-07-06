"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, UserCog } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
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
          className="grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full bg-white/15 text-sm font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="size-full object-cover"
            />
          ) : (
            initials(user.name)
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-64 rounded-md bg-popover p-2 text-popover-foreground shadow-md focus-visible:outline-none"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/settings/account"
              className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 outline-none transition-colors hover:bg-muted data-highlighted:bg-muted"
            >
              <Avatar
                name={user.name}
                src={user.avatarUrl}
                className="size-10 text-sm"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {ROLE_LABEL[user.role]} · {user.email}
                </div>
              </div>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border/60" />

          <DropdownMenu.Item asChild>
            <Link
              href="/settings/account"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:text-primary data-highlighted:text-primary"
            >
              <UserCog className="size-4 shrink-0" />
              Account settings
            </Link>
          </DropdownMenu.Item>

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
