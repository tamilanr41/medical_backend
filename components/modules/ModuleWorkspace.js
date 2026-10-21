import Link from "next/link";
import { ArrowLeft, Check, Construction, ExternalLink } from "lucide-react";
import StatePanel from "@/components/ui/StatePanel";
import { buttonVariants } from "@/components/ui/Button";
import { getCategory } from "@/lib/module-utils";
import { cn } from "@/lib/utils";

/**
 * Placeholder workspace rendered for modules that are registered in the
 * launcher but not yet implemented in this build.
 */
export default function ModuleWorkspace({ module }) {
  const category = getCategory(module.category);
  const Icon = module.icon;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 font-medium text-navy-600 transition hover:text-navy-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Home
        </Link>
        <span className="text-slate-300" aria-hidden="true">
          /
        </span>
        <span className="font-medium text-slate-500">{category?.label}</span>
        <span className="text-slate-300" aria-hidden="true">
          /
        </span>
        <span className="font-semibold text-slate-800">{module.name}</span>
      </nav>

      <section className="anim-fade-up rounded-xl border border-slate-200 bg-panel p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700 ring-1 ring-navy-100">
              <Icon className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {module.name}
                </h1>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em]",
                    category?.chip
                  )}
                >
                  {category?.label}
                </span>
              </div>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
                {module.description}
              </p>
            </div>
          </div>

          <Link
            href="/home"
            className={cn(buttonVariants({ variant: "secondary" }), "shrink-0")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Home
          </Link>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Application ref ID
            </dt>
            <dd className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-navy-800">
              {module.id}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Route
            </dt>
            <dd className="mt-1 font-mono text-[15px] font-semibold text-navy-800">
              {module.route}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Status
            </dt>
            <dd className="mt-1 text-[15px] font-semibold text-slate-700">
              {module.enabled ? "Enabled" : "Disabled"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Short code
            </dt>
            <dd className="mt-1 font-mono text-[15px] font-semibold text-slate-700">
              {module.shortName}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="planned-features-heading"
          className="anim-fade-up rounded-xl border border-slate-200 bg-panel p-6"
        >
          <h2
            id="planned-features-heading"
            className="text-[15px] font-semibold text-slate-900"
          >
            Planned capabilities
          </h2>
          <ul className="mt-4 space-y-3">
            {module.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-[13.5px] text-slate-600">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <StatePanel
          icon={Construction}
          eyebrow="Roadmap"
          title="Module under development"
          description={`The ${module.name} workspace is being migrated from the legacy Zhanx application. Routing, permissions and session handling for this module are already live in the new platform.`}
          tone="warning"
          actions={
            <>
              <Link href="/home" className={buttonVariants({ variant: "primary" })}>
                Back to Home
              </Link>
              <Link
                href="/settings"
                className={buttonVariants({ variant: "secondary" })}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Settings
              </Link>
            </>
          }
        />
      </div>
    </div>
  );
}

