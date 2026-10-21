import Link from "next/link";
import { ChevronRight, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Menu-driven index for a module landing page. Renders only the module's
 * top-level categories (from config/menu.js) so the page mirrors the
 * sidebar; each card links to the category page that lists its screens.
 */
export default function ModuleIndex({ module }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {module.categories.map((category) => {
        const count = category.items.length;
        const empty = count === 0;

        return (
          <li key={category.slug}>
            <Link
              href={`/${module.slug}/${category.slug}`}
              className={cn(
                "group flex h-full items-center gap-4 rounded-2xl border bg-panel p-5 shadow-[var(--shadow-card)] transition-all duration-200",
                empty
                  ? "border-dashed border-ink-200"
                  : "border-ink-200/70 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200",
                  empty
                    ? "bg-ink-100 text-ink-400"
                    : "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_14px_26px_-14px_rgba(16,31,53,0.75)] group-hover:scale-105"
                )}
              >
                <FolderOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink-800 transition-colors group-hover:text-brand-700">
                  {category.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] font-medium text-ink-400">
                  {empty ? "Coming soon" : `${count} ${count === 1 ? "screen" : "screens"}`}
                </span>
              </span>
              {!empty ? (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
