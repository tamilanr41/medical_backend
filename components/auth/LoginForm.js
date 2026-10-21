"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import { HOSPITAL } from "@/config/modules";

export default function LoginForm({ from }) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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
      <div className="relative rounded-[20px] border border-sky-300/25 bg-[#0e1c30]/55 p-7 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-9">
        <h2 className="text-[28px] font-bold tracking-tight text-white">Welcome Back</h2>
        <p className="mb-7 mt-2 text-sm text-slate-300">
          Sign in to your ZhanX HospitalOS account
        </p>

        <form onSubmit={handleSubmit} className="space-y-[18px]" noValidate>
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-[13px] font-semibold text-slate-300"
            >
              Username
            </label>
            <div className="flex items-center rounded-[11px] border border-sky-300/40 bg-[#050e1a]/45 transition-colors focus-within:border-sky-400 focus-within:shadow-[0_0_0_3px_rgba(51,182,255,0.22)]">
              <User
                className="ml-3 h-[17px] w-[17px] shrink-0 text-slate-400"
                strokeWidth={1.8}
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
                placeholder="Enter your username"
                className="w-full flex-1 bg-transparent px-2 py-[13px] text-[15px] text-white placeholder:text-slate-500 focus:outline-none focus-visible:outline-none focus-visible:shadow-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-[13px] font-semibold text-slate-300"
            >
              Password
            </label>
            <div className="flex items-center rounded-[11px] border border-sky-300/40 bg-[#050e1a]/45 transition-colors focus-within:border-sky-400 focus-within:shadow-[0_0_0_3px_rgba(51,182,255,0.22)]">
              <Lock
                className="ml-3 h-[17px] w-[17px] shrink-0 text-slate-400"
                strokeWidth={1.8}
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
                className="w-full flex-1 bg-transparent px-2 py-[13px] text-[15px] text-white placeholder:text-slate-500 focus:outline-none focus-visible:outline-none focus-visible:shadow-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="mr-2.5 flex items-center p-1 text-slate-400 transition hover:text-sky-300"
              >
                {showPassword ? (
                  <EyeOff className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Eye className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="anim-fade-in flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-300"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-1 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-[15px] w-[15px] cursor-pointer rounded border-sky-300/40 bg-transparent text-sky-400 focus:ring-sky-400"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="font-medium text-sky-300 transition hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-sky-600 via-sky-400 to-sky-300 py-[14.5px] text-[15px] font-bold text-[#04121f] shadow-[0_12px_28px_-10px_rgba(51,182,255,0.55)] transition-transform hover:brightness-[1.06] active:translate-y-0 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="h-[17px] w-[17px]" strokeWidth={2.2} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3.5 text-xs text-slate-400">
          <div className="h-px flex-1 bg-sky-300/20" />
          or
          <div className="h-px flex-1 bg-sky-300/20" />
        </div>

        <button
          type="button"
          onClick={() => setForgotOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-sky-300/25 bg-white/[0.02] py-[13px] text-sm font-semibold text-white transition-colors hover:border-sky-500 hover:bg-sky-400/[0.08]"
        >
          <KeyRound className="h-4 w-4 text-sky-300" strokeWidth={1.8} aria-hidden="true" />
          Contact Helpdesk
        </button>

        <div className="mt-[22px] flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-[19px] w-[19px] shrink-0 text-sky-300" strokeWidth={1.8} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-white">Secure Login</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
              Your data is protected with enterprise-grade security.
            </p>
          </div>
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
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
