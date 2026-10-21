import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/Button";

export default function SectionIndex({ module, category }) {
  return (
    <div className="space-y-6">
      {category.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-panel px-6 py-12 text-center shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold text-ink-800">Coming soon</h2>
          <p className="mt-2 text-sm text-ink-500">
            Screens for <strong>{category.title}</strong> will appear here when enabled in the menu.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href={`/${module.slug}`} className={cn(buttonVariants({ variant: "primary" }))}>
              Back to {module.title}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {category.items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/${module.slug}/${category.slug}/${item.slug}`}
                className="group flex h-full items-center gap-4 rounded-2xl border border-ink-200/70 bg-panel p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_14px_26px_-14px_rgba(16,31,53,0.75)] transition-transform duration-200 group-hover:scale-105"
                  aria-hidden="true"
                >
                  <LayoutGrid className="h-6 w-6" />
                </span>
                <h3 className="min-w-0 flex-1 text-[15px] font-semibold text-ink-800 transition-colors group-hover:text-brand-700">
                  {item.title}
                </h3>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-ink-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-500"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
