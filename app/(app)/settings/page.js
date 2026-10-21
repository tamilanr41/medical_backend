import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import { getSession } from "@/lib/auth";
import { SETTINGS_CATEGORIES } from "@/config/settings";
import { ROLE_LABELS } from "@/config/permissions";
import { buttonVariants } from "@/components/ui/Button";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export const metadata = {
  title: "Settings",
  description: "Zhanx HMS administration and configuration.",
};

function ManagedBy({ roles }) {
  if (roles.includes("SUPER_ADMIN")) {
    return <span className="text-slate-400">All administrators</span>;
  }
  return (
    <span className="text-slate-400">
      {roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}
    </span>
  );
}

export default async function SettingsPage() {
  const session = await getSession();
  const isAdministrator = ["SUPER_ADMIN", "ADMIN"].includes(session?.role);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)]">
              <Settings className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] dark:text-brand-400 text-brand-600">
                Administration
              </p>
              <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink-900">
                Settings
              </h1>
            </div>
          </div>

          {!isAdministrator ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[13px] font-medium text-amber-800">
              You are signed in as {session?.user?.roleLabel}. Administrative
              workspaces are read-only for your role.
            </p>
          ) : (
            <p className="max-w-md text-sm text-ink-500">
              Master data and system configuration workspaces, ready for CRUD
              implementation as the modules are migrated.
            </p>
          )}
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {SETTINGS_CATEGORIES.map((entry, index) => (
          <Link
            key={entry.slug}
            href={`/settings/${entry.slug}`}
            className="anim-fade-up group flex flex-col rounded-2xl border border-ink-200/80 bg-panel p-5 shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)] active:translate-y-0"
            style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)] transition-transform duration-200 group-hover:scale-105">
                <entry.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <ChevronRight
                className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                aria-hidden="true"
              />
            </div>

            <h2 className="mt-4 text-[15px] font-semibold text-ink-800 group-hover:text-brand-700">
              {entry.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-500">
              {entry.description}
            </p>

            <p className="mt-auto pt-4 text-[11.5px]">
              <span className="font-semibold uppercase tracking-wide text-ink-400">
                Managed by{" "}
              </span>
              <ManagedBy roles={entry.managedBy} />
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/home" className={buttonVariants({ variant: "secondary" })}>
          Back to Home
        </Link>
        <Link
          href="/profile/preferences"
          className={buttonVariants({ variant: "ghost" })}
        >
          My preferences
        </Link>
      </div>
    </div>
  );
}
