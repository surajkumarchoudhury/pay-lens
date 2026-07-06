"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { label: "Account", href: "/settings/account" },
  { label: "Organization", href: "/settings/organization" },
];

/** Sub-navigation shared by the settings pages (Account · Organization). */
export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border/60">
      <nav className="-mb-px flex gap-6">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
