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
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Departments", href: "/departments", icon: Building2 },
  { label: "Settings", href: "/settings/organization", icon: Settings },
  { label: "Audit", href: "/audit", icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-24 shrink-0 flex-col border-r border-white/10 bg-linear-to-b from-[var(--nav-from)] to-[var(--nav-to)] text-white">
      <nav className="flex-1 space-y-2 p-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-1 py-3 text-center transition-colors",
                active
                  ? "border-white bg-white/10 text-white dark:bg-black/25"
                  : "border-transparent text-white/60 hover:bg-white/10 hover:text-white dark:hover:bg-black/20",
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
