import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account."
      subtitle="Join as a customer looking for a place, or as an owner ready to list."
    >
      <SignupForm />
    </AuthShell>
  );
}
