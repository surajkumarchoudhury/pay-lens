import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full">
      <h1 className="mb-8 text-center text-2xl font-bold tracking-tight">
        Sign In
      </h1>

      <LoginForm />
    </div>
  );
}
