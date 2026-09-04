import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back."
      subtitle="Log in with your Delala account to continue as a customer or property owner."
    >
      <LoginForm />
    </AuthShell>
  );
}
