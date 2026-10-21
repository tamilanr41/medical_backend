import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CircleUserRound,
  KeyRound,
  LayoutGrid,
  SlidersHorizontal,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccessModuleList } from "@/config/permissions";
import { buttonVariants } from "@/components/ui/Button";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { HOSPITAL, MODULES } from "@/config/modules";

export const metadata = {
  title: "Profile",
};

const ACTIONS = [
  {
    href: "/profile/change-password",
    icon: KeyRound,
    title: "Change Password",
    body: "Update the password for your account.",
  },
  {
    href: "/profile/preferences",
    icon: SlidersHorizontal,
    title: "Preferences",
    body: "Launcher defaults, module grid options and saved data.",
  },
  {
    href: "/settings",
    icon: LayoutGrid,
    title: "Settings",
    body: "Master data and system configuration workspaces.",
  },
];

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const details = [
    { label: "Username", value: session.user.username },
    { label: "Role", value: session.user.roleLabel },
    { label: "Department", value: session.user.department },
    { label: "Designation", value: session.user.designation },
    { label: "Campus", value: HOSPITAL.campus },
    { label: "Accessible modules", value: `${canAccessModuleList(session.role).length}/${MODULES.length}` },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <Breadcrumbs className="mb-4" />
      <header className="anim-fade-up relative overflow-hidden rounded-2xl border border-ink-200 bg-panel shadow-[var(--shadow-card)]">
        <span
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-700"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-brand-50"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3 p-5 sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)]">
            <CircleUserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] dark:text-brand-400 text-brand-600">
              Account
            </p>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink-900">
              My Profile
            </h1>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="profile-summary"
          className="anim-fade-up rounded-2xl border border-ink-200 bg-panel p-6 shadow-[var(--shadow-card)] lg:col-span-1"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-semibold text-white shadow-sm">
              {session.user.initials}
            </span>
            <div className="min-w-0">
              <h2
                id="profile-summary"
                className="truncate text-lg font-semibold text-ink-900"
              >
                {session.user.name}
              </h2>
              <p className="truncate text-sm text-ink-500">
                {session.user.designation}
              </p>
              <span className="mt-1.5 inline-flex rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide dark:text-brand-400 text-brand-700">
                {session.user.roleLabel}
              </span>
            </div>
          </div>

          <dl className="mt-6 space-y-3 text-[13.5px]">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between gap-4 border-b border-ink-100 pb-2.5"
              >
                <dt className="text-ink-500">{detail.label}</dt>
                <dd className="text-right font-semibold text-ink-800">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 flex items-start gap-2 rounded-lg bg-ink-50 p-3 text-[12.5px] leading-relaxed text-ink-500">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
            Profile attributes come from the authenticated session. Contact the
            HR / IT helpdesk to request changes.
          </p>
        </section>

        <section
          aria-labelledby="account-actions"
          className="anim-fade-up space-y-4 lg:col-span-2"
        >
          <h2 id="account-actions" className="sr-only">
            Account actions
          </h2>
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-4 rounded-2xl border border-ink-200 bg-panel p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white transition-transform group-hover:scale-105">
                <action.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink-800 group-hover:text-brand-700">
                  {action.title}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-500">
                  {action.body}
                </span>
              </span>
            </Link>
          ))}

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/home" className={buttonVariants({ variant: "primary" })}>
              Back to Home
            </Link>
            <Link
              href="/profile/change-password"
              className={buttonVariants({ variant: "secondary" })}
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Change Password
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
