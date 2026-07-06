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

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Organization details, base currency, and FX rates.
        </p>
      </div>

      {org ? (
        <>
          <OrganizationProfileCard
            name={org.name}
            baseCurrency={org.baseCurrency}
            employeeCount={org.employeeCount}
            departmentCount={org.departmentCount}
            createdAt={org.createdAt}
            currencies={currencies}
            canEdit={canEdit}
          />
          <ExchangeRatesCard
            currencies={currencies}
            baseCurrency={org.baseCurrency}
          />
        </>
      ) : (
        <div className="rounded-xs border border-dashed p-12 text-center text-sm text-muted-foreground">
          No organization configured. Run the database seed to get started.
        </div>
      )}
    </div>
  );
}
