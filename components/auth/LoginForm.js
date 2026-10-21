"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff, KeyRound, Loader2, LogIn, User } from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { HOSPITAL } from "@/config/modules";

export default function LoginForm({ accounts, from }) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, remember }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Sign in failed. Please try again.");
        setSubmitting(false);
        return;
      }

      const destination =
        typeof from === "string" &&
        from.startsWith("/") &&
        !from.startsWith("//")
          ? from
          : data.redirect || "/home";

      router.push(destination);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="anim-fade-up rounded-2xl border border-slate-200 bg-panel p-6 shadow-[0_24px_60px_-40px_rgba(16,31,53,0.5)] sm:p-8">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-navy-500">
            Secure sign in
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to open your hospital module launcher.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-[13px] font-semibold text-slate-700"
            >
              Username
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. admin"
                className="h-11 w-full rounded-lg border border-slate-300 bg-panel pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[13px] font-semibold text-slate-700"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-[12.5px] font-medium text-navy-600 transition hover:text-navy-800 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="h-11 w-full rounded-lg border border-slate-300 bg-panel pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#244674]"
            />
            Keep me signed in on this device
          </label>

          {error ? (
            <p
              role="alert"
              className="anim-fade-in flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-700"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Login
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Demo access
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {accounts.map((account) => (
              <li key={account.username} className="text-[12.5px] text-slate-600">
                <span className="font-mono font-semibold text-navy-700">
                  {account.username}
                </span>
                <span className="text-slate-400"> · {account.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[12px] text-slate-500">
            Password for all demo accounts:{" "}
            <span className="font-mono font-semibold text-navy-700">demo@123</span>
          </p>
        </div>
      </div>

      <Dialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset password"
        description="Password resets are handled by the hospital IT helpdesk."
      >
        <div className="px-5 py-5">
          <p className="text-sm leading-relaxed text-slate-600">
            For security reasons, {HOSPITAL.name} credentials are managed by
            the IT administration team. Contact the helpdesk to reset your
            password or unlock your account.
          </p>
          <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Helpdesk</dt>
              <dd className="font-semibold text-slate-800">
                {HOSPITAL.supportExtension}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-semibold text-navy-700">
                {HOSPITAL.supportEmail}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex justify-end">
            <Button variant="secondary" onClick={() => setForgotOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

