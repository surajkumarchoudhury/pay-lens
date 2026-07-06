"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import type { UserRole } from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { formatLongDate } from "@/lib/date";
import { updateAccountProfile } from "@/app/(authenticated)/settings/account/actions";

const ROLE_LABEL: Record<UserRole, string> = {
  HR_MANAGER: "HR Manager",
  VIEWER: "Read-only",
};

type Props = {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string; // ISO
};

/**
 * Personal account card. A pencil flips it into an inline edit form for the
 * user's own display name; email and role are read-only. Every signed-in user
 * can edit their own profile — no role gate.
 */
export function AccountProfileCard({
  name,
  email,
  avatarUrl,
  role,
  createdAt,
}: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="relative rounded-xs border border-border/60 bg-card p-5">
      {!editing && (
        <Tooltip label="Edit profile">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit profile"
            className="absolute right-3 top-3 rounded-xs p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
        </Tooltip>
      )}

      {editing ? (
        <EditForm
          name={name}
          avatarUrl={avatarUrl}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <Avatar
            name={name}
            src={avatarUrl}
            className="size-20 rounded-xs text-2xl"
          />
          <h2 className="mt-4 text-lg font-semibold leading-tight text-foreground">
            {name}
          </h2>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {ROLE_LABEL[role]}
            </span>
          </div>

          <div className="my-4 border-t border-border/60" />

          <dl className="space-y-0.5">
            <InfoRow label="Email" value={email} />
            <InfoRow label="Role" value={ROLE_LABEL[role]} />
            <InfoRow label="Member since" value={formatLongDate(createdAt)} />
          </dl>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className="min-w-0 truncate text-right font-medium text-foreground"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function EditForm({
  name: initialName,
  avatarUrl: initialAvatarUrl,
  onDone,
}: {
  name: string;
  avatarUrl: string | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updateAccountProfile(
        { ok: false, error: null },
        formData,
      );
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        <Avatar
          name={name || "?"}
          src={avatarUrl || null}
          className="size-20 rounded-xs text-2xl"
        />
        <div className="w-full">
          <label
            htmlFor="account-avatar"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Avatar URL
          </label>
          <Input
            id="account-avatar"
            name="avatarUrl"
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Leave blank to use your name initials.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="account-name"
          className="mb-1.5 block text-xs font-medium text-foreground"
        >
          Display name
        </label>
        <Input
          id="account-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="off"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
