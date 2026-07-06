import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Already signed in? Skip the login screen.
  if (await getSession()) redirect("/");

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Reused chrome header — auth mode shows only the logo + theme toggle. */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: fixed-width panel; the form fills it (full width on mobile). */}
        <div className="flex w-full flex-col justify-center overflow-y-auto bg-card px-8 py-10 sm:px-12 lg:w-[440px] lg:shrink-0">
          {children}
        </div>

        {/* Right: two angled triangles split along the diagonal, mixing in the
            middle. The top triangle starts denser at its top and eases to
            lighter along the diagonal; the bottom triangle runs lighter -> denser
            toward the bottom. */}
        <div className="relative hidden flex-1 overflow-hidden bg-[var(--nav-from)] lg:block">
          <div
            className="absolute inset-0 bg-linear-to-b from-[var(--nav-from)] to-[var(--nav-to)]"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
          />
          <div
            className="absolute inset-0 bg-linear-to-b from-[var(--nav-to)] to-[var(--nav-from)]"
            style={{ clipPath: "polygon(0 0, 0 100%, 100% 100%)" }}
          />

          <div className="relative flex h-full items-center justify-center p-12 text-center text-white">
            <div className="w-4/5 space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Compensation insight, at a glance
              </h2>
              <p className="text-white/80">
                Manage salaries across countries and currencies, and turn pay
                data into analytics your HR team can act on.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
