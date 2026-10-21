"use client";

import { History, LayoutGrid } from "lucide-react";
import { formatRelativeTime } from "@/lib/module-utils";
import { ICON_BY_MODULE_ID } from "@/config/modules";

/** Recently used modules as compact icon cards with relative timestamps. */
export default function RecentModules({ recents, onOpen }) {
  if (!recents.length) return null;

  return (
    <section id="recently" aria-labelledby="recently-heading" className="scroll-mt-24">
      <div className="mb-2.5 flex items-center gap-2">
        <h2
          id="recently-heading"
          className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-500"
        >
          <History className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
          Recently Used
        </h2>
        <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
      </div>

      <ol className="flex flex-wrap gap-2">
        {recents.map((entry) => {
          const Icon = ICON_BY_MODULE_ID[entry.id] ?? LayoutGrid;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="group flex items-center gap-2.5 rounded-xl border border-ink-200/70 bg-panel py-2 pl-2.5 pr-3.5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-left">
                  <span className="block text-[13px] font-semibold text-ink-800">
                    {entry.name}
                  </span>
                  <span className="block text-[11px] tabular-nums text-ink-400">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}