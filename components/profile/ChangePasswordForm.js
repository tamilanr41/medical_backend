"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Save,
} from "lucide-react";
import Button from "@/components/ui/Button";

const POLICY = [
  "At least 8 characters",
  "Different from your current password",
  "Stored server-side for this demo deployment",
];

export default function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Password could not be updated.");
        return;
      }

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-slate-300 bg-panel px-3 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-navy-400 focus:ring-2 focus:ring-navy-100";

  return (
    <form
      onSubmit={handleSubmit}
      className="anim-fade-up space-y-5 rounded-xl border border-slate-200 bg-panel p-6"
      noValidate
    >
      <div className="relative">
        <label
          htmlFor="current-password"
          className="mb-1.5 block text-[13px] font-semibold text-slate-700"
        >
          Current password
        </label>
        <input
          id="current-password"
          type={showPasswords ? "text" : "password"}
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClass}
          placeholder="Enter current password"
        />
      </div>

      <div>
        <label
          htmlFor="new-password"
          className="mb-1.5 block text-[13px] font-semibold text-slate-700"
        >
          New password
        </label>
        <input
          id="new-password"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={inputClass}
          placeholder="Enter new password"
        />
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="mb-1.5 block text-[13px] font-semibold text-slate-700"
        >
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
          placeholder="Re-enter new password"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="space-y-1.5">
          {POLICY.map((rule) => (
            <li
              key={rule}
              className="flex items-center gap-2 text-[12.5px] text-slate-500"
            >
              <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              {rule}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setShowPasswords((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-medium text-slate-600 transition hover:border-navy-200 hover:text-navy-700"
        >
          {showPasswords ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {showPasswords ? "Hide" : "Show"} passwords
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="anim-fade-in flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-700"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          className="anim-fade-in flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-medium text-emerald-700"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {success}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Update password
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

