"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/Button";

function Meta({ label, children }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink-800">{children}</dd>
    </div>
  );
}

export default function GenericScreen({ module, category, item }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-panel shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 border-b border-ink-100 bg-gradient-to-r from-brand-50 via-panel to-brand-50/60 px-6 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.95)]">
            <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Screen placeholder</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Generic CRUD/list/report screens will be generated from{" "}
              <code className="rounded bg-brand-50 px-1 py-0.5 text-[12px] dark:text-brand-400 text-brand-700">
                config/entities.js
              </code>{" "}
              and the resource API.
            </p>
          </div>
        </div>
        <div className="px-6 py-6">
          <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Meta label="Module">
              {module.title} (ID {module.id})
            </Meta>
            <Meta label="Category">{category.title}</Meta>
            <Meta label="Item">{item.title}</Meta>
            <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Route
              </dt>
              <dd className="mt-1 font-mono text-xs text-ink-500">
                /{module.slug}/{category.slug}/{item.slug}
              </dd>
            </div>
            <Meta label="Screen Type">
              <span className="capitalize">{item.screen.type}</span>
            </Meta>
            <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Collection
              </dt>
              <dd className="mt-1 font-mono text-xs text-ink-500">
                {item.screen.collection || "-"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-ink-100 bg-ink-50/70 px-6 py-4">
          <Link
            href={`/${module.slug}/${category.slug}`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Back to {category.title}
          </Link>
          <Link
            href={`/${module.slug}`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Back to {module.title}
          </Link>
        </div>
      </div>
    </div>
  );
}
