"use client";

import Link from "next/link";
import { ArrowUpRight, LayoutGrid, Loader2, Lock } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { ICON_BY_MODULE_ID } from "@/config/modules";
import { cn } from "@/lib/utils";

const TILES = [
  ["from-brand-500", "to-brand-700"],
  ["from-emerald-500", "to-emerald-700"],
  ["from-violet-500", "to-violet-700"],
  ["from-sky-500", "to-sky-700"],
  ["from-amber-500", "to-amber-700"],
  ["from-rose-500", "to-rose-700"],
  ["from-teal-500", "to-teal-700"],
];

export function tileTone(id) {
  let hash = 0;
  const source = String(id ?? "");
  for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  return TILES[hash % TILES.length];
}

/** Premium module card: gradient icon tile, description, hover lift + open affordance. */
export default function ModuleCard({
  module,
  isFavorite,
  onToggleFavorite,
  onOpen,
  isOpening,
}) {
  const Icon = ICON_BY_MODULE_ID[module.id] ?? LayoutGrid;
  const accessible = module.enabled && module.allowed;
  const [from, to] = tileTone(module.id);

  function handleClick(event) {
    if (!accessible) {
      event.preventDefault();
      event.stopPropagation();
    }
    onOpen(module, { skipNavigation: !accessible });
  }

  return (
    <div className="group relative">
      <Link
        href={accessible ? module.route : "#"}
        onClick={handleClick}
        aria-disabled={!accessible}
        aria-label={`${module.name} module${accessible ? "" : " (unavailable)"}`}
        className={cn(
          "relative block overflow-hidden rounded-xl border border-ink-200/70 bg-panel p-3 shadow-[var(--shadow-card)] transition-all duration-200",
          accessible
            ? "hover:-translate-y-1 hover:border-brand-200/80 hover:shadow-[var(--shadow-lift)]"
            : "cursor-not-allowed border-dashed opacity-60"
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-opacity duration-300",
            accessible && "group-hover:opacity-[0.16]",
            from,
            to
          )}
          aria-hidden="true"
        />

        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-[0_12px_22px_-12px_rgba(21,90,225,0.85)] transition-transform duration-200 group-hover:scale-[1.06]",
              from,
              to
            )}
            aria-hidden="true"
          >
            {isOpening ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <Icon className="h-[20px] w-[20px]" strokeWidth={1.9} />
            )}
          </span>

          <span className="min-w-0 flex-1 pt-0.5">
            <span className="flex items-center gap-1.5 pr-7">
              <span className="truncate text-[14.5px] font-semibold tracking-tight text-ink-900">
                {module.name}
              </span>
              {!accessible ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
              ) : null}
            </span>
            <span className="mt-1 block truncate text-[12px] text-ink-500">
              {module.description}
            </span>
          </span>
        </div>

        {accessible ? (
          <>
            <span className="absolute right-2.5 top-2.5">
              <FavoriteButton
                module={module}
                isFavorite={isFavorite}
                onToggle={onToggleFavorite}
                className={cn(
                  "opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100",
                  isFavorite && "opacity-100"
                )}
              />
            </span>
            <span className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                Open module
              </span>
              <ArrowUpRight
                className="h-4 w-4 text-ink-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600"
                aria-hidden="true"
              />
            </span>
          </>
        ) : null}
      </Link>
    </div>
  );
}