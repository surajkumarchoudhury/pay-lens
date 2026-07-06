import { ExchangeRatesCard } from "@/components/settings/exchange-rates-card";
import { OrganizationProfileCard } from "@/components/settings/organization-profile-card";
import { getSession } from "@/lib/auth/session";
import { getCurrencies } from "@/lib/employees";
import { getOrganizationSettings } from "@/lib/organization";

export default async function OrganizationSettingsPage() {
  const [org, currencies, user] = await Promise.all([
    getOrganizationSettings(),
    getCurrencies(),
    getSession(),
  ]);

  const canEdit = user?.role === "HR_MANAGER";

  if (!org) {
    return (
      <div className="rounded-xs border border-dashed p-12 text-center text-sm text-muted-foreground">
        No organization configured. Run the database seed to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left: organization inspector. Sticky so it stays in view while the
          exchange-rate table scrolls on the right. */}
      <aside className="shrink-0 lg:sticky lg:top-0 lg:w-[370px]">
        <OrganizationProfileCard
          name={org.name}
          avatarUrl={org.avatarUrl}
          baseCurrency={org.baseCurrency}
          employeeCount={org.employeeCount}
          departmentCount={org.departmentCount}
          createdAt={org.createdAt}
          currencies={currencies}
          canEdit={canEdit}
        />
      </aside>

      <div className="min-w-0 flex-1">
        <ExchangeRatesCard
          currencies={currencies}
          baseCurrency={org.baseCurrency}
        />
      </div>
    </div>
  );
}
