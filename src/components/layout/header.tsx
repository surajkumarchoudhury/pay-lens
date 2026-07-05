import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-linear-to-r from-[var(--nav-from)] to-[var(--nav-to)] px-6 text-white">
      <Logo onDark className="text-xl" />

      <div className="flex items-center gap-3">
        <ThemeToggle className="text-white hover:bg-white/10 hover:text-white" />
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-full bg-white/15 text-xs font-medium text-white">
            HR
          </div>
          <div className="hidden text-sm leading-tight sm:block">
            <div className="font-medium">HR Manager</div>
            <div className="text-xs text-white/70">hr@acme.com</div>
          </div>
        </div>
      </div>
    </header>
  );
}
