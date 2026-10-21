"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { buildBreadcrumbs } from "@/lib/menu-utils";
import { cn } from "@/lib/utils";

/** Breadcrumb trail for the current route. Hidden unless it has depth (or forced). */
export default function Breadcrumbs({ className, alwaysShow = false }) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  if (!alwaysShow && crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 text-ink-300" aria-hidden="true" />
            ) : null}
            {last || !crumb.href ? (
              <span
                aria-current={last ? "page" : undefined}
                className="text-[12px] font-semibold text-ink-700"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-[12px] font-medium text-ink-400 transition hover:text-brand-700"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
