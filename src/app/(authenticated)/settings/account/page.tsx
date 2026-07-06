import { AccountProfileCard } from "@/components/settings/account-profile-card";
import { getAccountProfile } from "@/lib/account";

export default async function AccountSettingsPage() {
  const account = await getAccountProfile();

  if (!account) {
    return (
      <div className="rounded-xs border border-dashed p-12 text-center text-sm text-muted-foreground">
        Account not found.
      </div>
    );
  }

  return (
    <div className="max-w-[370px]">
      <AccountProfileCard
        name={account.name}
        email={account.email}
        avatarUrl={account.avatarUrl}
        role={account.role}
        createdAt={account.createdAt}
      />
    </div>
  );
}
