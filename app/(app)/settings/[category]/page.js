import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Lock, Settings2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { SETTINGS_MAP } from "@/config/settings";
import { ROLE_LABELS } from "@/config/permissions";
import StatePanel from "@/components/ui/StatePanel";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { buttonVariants } from "@/components/ui/Button";

export async function generateMetadata({ params }) {
  const { category } = await params;
  const entry = SETTINGS_MAP[category];
  if (!entry) return { title: "Settings" };
  return { title: `${entry.name} settings` };
}

export default async function SettingsCategoryPage({ params }) {
  const { category } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const entry = SETTINGS_MAP[category];
  if (!entry) notFound();

  const permitted = entry.managedBy.includes(session.role);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs labels={{ [category]: entry.name }} />

      <section className="anim-fade-up relative overflow-hidden rounded-2xl border border-ink-200 bg-panel p-6 shadow-[var(--shadow-card)] sm:p-8">
        <span
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-700"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)]">
              <entry.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] dark:text-brand-400 text-brand-600">
                Settings workspace
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
                {entry.name}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">
                {entry.description}
              </p>
            </div>
          </div>

          <Link
            href="/settings"
            className={buttonVariants({ variant: "secondary", className: "shrink-0" })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All settings
          </Link>
        </div>
      </section>

      {!permitted ? (
        <StatePanel
          icon={Lock}
          eyebrow="Restricted workspace"
          title="You don't have permission to manage this workspace."
          description={`Managing ${entry.name} is restricted to ${entry.managedBy
            .map((role) => ROLE_LABELS[role] ?? role)
            .join(", ")}. Your current role is ${session.user.roleLabel}.`}
          tone="danger"
          actions={
            <Link href="/settings" className={buttonVariants({ variant: "primary" })}>
              Back to Settings
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section
            aria-labelledby="configuration-areas"
            className="anim-fade-up rounded-xl border border-slate-200 bg-panel p-6"
          >
            <h2
              id="configuration-areas"
              className="text-[15px] font-semibold text-slate-900"
            >
              Configuration areas
            </h2>
            <ul className="mt-4 space-y-3">
              {entry.fields.map((field) => (
                <li
                  key={field}
                  className="flex items-start gap-2.5 text-[13.5px] text-slate-600"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  {field}
                </li>
              ))}
            </ul>
          </section>

          <StatePanel
            icon={Settings2}
            eyebrow="Migration status"
            title="CRUD console coming with the next migration wave"
            description={`${entry.name} is registered in the settings navigation and permission model. Record management screens will be enabled as this master data is migrated from the legacy Zhanx application.`}
            tone="info"
            details={[
              { label: "Workspace", value: entry.name },
              { label: "Route", value: `/settings/${entry.slug}` },
              { label: "Your role", value: session.user.roleLabel },
            ]}
            actions={
              <>
                <Link href="/settings" className={buttonVariants({ variant: "primary" })}>
                  Back to Settings
                </Link>
                <Link href="/home" className={buttonVariants({ variant: "secondary" })}>
                  Module launcher
                </Link>
              </>
            }
          />
        </div>
      )}
    </div>
  );
}
