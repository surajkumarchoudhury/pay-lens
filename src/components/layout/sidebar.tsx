"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path prefix that marks this item active; defaults to `href`. */
  match?: string;
  /** Pin to the bottom of the sidebar, away from the content nav. */
  pinBottom?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Departments", href: "/departments", icon: Building2 },
  { label: "Audit", href: "/audit", icon: ScrollText },
  // Settings is app configuration, not a content view — anchored to the bottom.
  {
    label: "Settings",
    href: "/settings/organization",
    icon: Settings,
    match: "/settings",
    pinBottom: true,
  },
];

function isActive(pathname: string, item: NavItem) {
  const base = item.match ?? item.href;
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-24 shrink-0 flex-col border-r border-white/10 bg-linear-to-b from-[var(--nav-from)] to-[var(--nav-to)] text-white">
      <nav className="flex-1 space-y-2 p-2">
        {NAV_ITEMS.map((item) => {
          const { label, href, icon: Icon } = item;
          const active = isActive(pathname, item);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-1 py-3 text-center transition-colors",
                item.pinBottom && "mt-auto",
                active
                  ? "border-white/50 bg-white/10 text-white dark:border-white/35 dark:bg-black/25 dark:text-white/85"
                  : "border-transparent text-white/60 hover:bg-white/10 hover:text-white dark:text-white/50 dark:hover:bg-black/20 dark:hover:text-white/85",
              )}
            >
              <Icon className="size-6 shrink-0" />
              <span className="text-[11px] font-medium leading-tight">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
