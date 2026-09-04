"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthSuccess, login } from "@/lib/auth";
import type { AuthErrors, UserType } from "@/lib/auth-types";
import CustomSelect from "@/components/ui/CustomSelect";

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "owner", label: "Property Owner" },
];

export default function LoginForm() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthErrors>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    const result = await login({
      email,
      password,
      user_type: userType,
    });

    setLoading(false);

    if (isAuthSuccess(result)) {
      router.push(result.redirect);
      router.refresh();
      return;
    }

    setErrors(result.errors);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {errors.form ? <div className="form-error">{errors.form}</div> : null}

      <div className="field">
        <label htmlFor="user_type">I am a</label>
        <CustomSelect
          id="user_type"
          name="user_type"
          value={userType}
          options={ROLE_OPTIONS}
          onChange={(next) => setUserType(next as UserType)}
          disabled={loading}
          aria-label="I am a"
        />
        {errors.user_type ? (
          <p className="field-error">{errors.user_type}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
        {errors.email ? <p className="field-error">{errors.email}</p> : null}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
        {errors.password ? (
          <p className="field-error">{errors.password}</p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Signing in…" : "Log in"}
      </button>

      <p className="text-sm font-light text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-ink underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
