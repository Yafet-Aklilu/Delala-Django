"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthSuccess, signup } from "@/lib/auth";
import type { AuthErrors, UserType } from "@/lib/auth-types";
import CustomSelect from "@/components/ui/CustomSelect";

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "owner", label: "Property Owner" },
];

const initial = {
  user_type: "customer" as UserType,
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  phone_no: "",
  password: "",
  confirm_password: "",
};

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    const result = await signup(form);
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
          value={form.user_type}
          options={ROLE_OPTIONS}
          onChange={(next) => update("user_type", next as UserType)}
          disabled={loading}
          aria-label="I am a"
        />
        {errors.user_type ? (
          <p className="field-error">{errors.user_type}</p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="first_name">First name</label>
          <input
            id="first_name"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            disabled={loading}
            required
          />
          {errors.first_name ? (
            <p className="field-error">{errors.first_name}</p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="last_name">Last name</label>
          <input
            id="last_name"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            disabled={loading}
            required
          />
          {errors.last_name ? (
            <p className="field-error">{errors.last_name}</p>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          disabled={loading}
          autoComplete="username"
          required
        />
        {errors.username ? (
          <p className="field-error">{errors.username}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          disabled={loading}
          autoComplete="email"
          required
        />
        {errors.email ? <p className="field-error">{errors.email}</p> : null}
      </div>

      <div className="field">
        <label htmlFor="phone_no">Phone number</label>
        <input
          id="phone_no"
          value={form.phone_no}
          onChange={(e) => update("phone_no", e.target.value)}
          disabled={loading}
          inputMode="tel"
          placeholder=""
          required
        />
        {errors.phone_no ? (
          <p className="field-error">{errors.phone_no}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          disabled={loading}
          autoComplete="new-password"
          required
        />
        {errors.password ? (
          <p className="field-error">{errors.password}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="confirm_password">Confirm password</label>
        <input
          id="confirm_password"
          type="password"
          value={form.confirm_password}
          onChange={(e) => update("confirm_password", e.target.value)}
          disabled={loading}
          autoComplete="new-password"
          required
        />
        {errors.confirm_password ? (
          <p className="field-error">{errors.confirm_password}</p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm font-light text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
