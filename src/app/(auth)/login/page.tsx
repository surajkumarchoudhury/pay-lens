import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-card-foreground shadow-sm">
      <div className="mb-6 space-y-2 text-center">
        <Logo className="text-2xl" />
        <p className="text-sm text-muted-foreground">
          Compensation management for HR
        </p>
      </div>

      {/* TODO(auth): replace with the real credentials form + server action. */}
      <Button className="w-full" disabled>
        Sign in
      </Button>
    </div>
  );
}
