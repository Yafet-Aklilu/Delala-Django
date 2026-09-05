"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { completeFirebaseProfile, isAuthSuccess } from "@/lib/auth";
import type { AuthErrors, ProfileCompletionNeeded, UserType } from "@/lib/auth-types";
import CustomSelect from "@/components/ui/CustomSelect";

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "owner", label: "Property Owner" },
];

type Props = {
  pending: ProfileCompletionNeeded;
  onCancel: () => void;
};

export default function ProfileCompletionForm({ pending, onCancel }: Props) {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>("customer");
  const [username, setUsername] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [errors, setErrors] = useState<AuthErrors>(pending.errors || {});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    const result = await completeFirebaseProfile({
      user_type: userType,
      username: username.trim(),
      phone_no: phoneNo.trim(),
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
      <div>
        <p className="eyebrow text-accent">Almost there</p>
        <p className="mt-2 text-sm font-light leading-relaxed text-ink-soft">
          Finish your Delala profile for{" "}
          <span className="text-ink">{pending.email || "your Google account"}</span>.
        </p>
      </div>

      {errors.form ? <div className="form-error">{errors.form}</div> : null}

      <div className="field">
        <label htmlFor="complete_user_type">I am a</label>
        <CustomSelect
          id="complete_user_type"
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
        <label htmlFor="complete_username">Username</label>
        <input
          id="complete_username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          autoComplete="username"
          required
        />
        {errors.username ? (
          <p className="field-error">{errors.username}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="complete_phone">Phone number</label>
        <input
          id="complete_phone"
          value={phoneNo}
          onChange={(e) => setPhoneNo(e.target.value)}
          disabled={loading}
          inputMode="tel"
          placeholder="09XXXXXXXX"
          required
        />
        {errors.phone_no ? (
          <p className="field-error">{errors.phone_no}</p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Saving…" : "Complete profile"}
      </button>

      <button
        type="button"
        className="btn btn-ghost w-full"
        onClick={onCancel}
        disabled={loading}
      >
        Back to log in
      </button>
    </form>
  );
}
