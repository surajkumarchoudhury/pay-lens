import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/layout/user-menu";
import type { SessionUser } from "@/lib/auth/session";

export function Header({ user }: { user?: SessionUser }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-linear-to-r from-[var(--nav-from)] to-[var(--nav-to)] px-6 text-white">
      <Logo onDark className="text-xl" />

      <div className="flex items-center gap-2">
        <ThemeToggle className="text-white hover:bg-white/10 hover:text-white" />
        {user && <UserMenu user={user} />}
      </div>
    </header>
  );
}
