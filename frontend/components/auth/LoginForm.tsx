"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isAuthSuccess,
  isProfileCompletionNeeded,
  login,
  loginWithGoogle,
} from "@/lib/auth";
import type {
  AuthErrors,
  ProfileCompletionNeeded,
  UserType,
} from "@/lib/auth-types";
import CustomSelect from "@/components/ui/CustomSelect";
import ProfileCompletionForm from "@/components/auth/ProfileCompletionForm";

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [profilePending, setProfilePending] =
    useState<ProfileCompletionNeeded | null>(null);

  const busy = loading || googleLoading;

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

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    setErrors({});

    const result = await loginWithGoogle();

    setGoogleLoading(false);

    if (isAuthSuccess(result)) {
      router.push(result.redirect);
      router.refresh();
      return;
    }

    if (isProfileCompletionNeeded(result)) {
      setProfilePending(result);
      return;
    }

    setErrors(result.errors);
  }

  if (profilePending) {
    return (
      <ProfileCompletionForm
        pending={profilePending}
        onCancel={() => {
          setProfilePending(null);
          setErrors({});
        }}
      />
    );
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
          disabled={busy}
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
          disabled={busy}
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
          disabled={busy}
          required
        />
        {errors.password ? (
          <p className="field-error">{errors.password}</p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {loading ? "Signing in…" : "Log in"}
      </button>

      <div className="auth-or" aria-hidden="true">
        <span className="auth-or__line" />
        <span className="auth-or__label">or</span>
        <span className="auth-or__line" />
      </div>

      <button
        type="button"
        className="btn btn-ghost w-full"
        onClick={() => void onGoogleSignIn()}
        disabled={busy}
        aria-busy={googleLoading}
      >
        <span className="google-g" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="18" height="18">
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7 12.9 19.5C14.7 15.2 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l.1.1 6.3 5.2C39.1 37.1 44 32 44 24c0-1.3-.1-2.7-.4-3.9z"
            />
          </svg>
        </span>
        {googleLoading ? "Connecting…" : "Continue with Google"}
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
