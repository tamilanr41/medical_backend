"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Star } from "lucide-react";
import {
  getMenuFavoritesSnapshot,
  getServerMenuFavoritesSnapshot,
  pushMenuRecent,
  subscribeLauncherStorage,
  toggleMenuFavorite,
} from "@/lib/storage";
import Breadcrumbs from "./Breadcrumbs";
import { cn } from "@/lib/utils";

/** Records the open screen into the menu recents list (storage only). */
function RecentTracker({ entry }) {
  const id = entry?.id;
  const path = entry?.path;
  const title = entry?.title;
  const moduleTitle = entry?.module;

  useEffect(() => {
    if (!id) return;
    pushMenuRecent({ id, path, title, module: moduleTitle, timestamp: Date.now() });
  }, [id, path, title, moduleTitle]);

  return null;
}

function FavoriteButton({ entry, favorites }) {
  const active = favorites.includes(entry.id);

  return (
    <button
      type="button"
      onClick={() => toggleMenuFavorite(entry.id)}
      aria-pressed={active}
      title={active ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold shadow-sm transition",
        active
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-ink-200 bg-panel text-ink-500 hover:border-ink-300 hover:text-ink-700"
      )}
    >
      <Star className={cn("h-4 w-4", active && "fill-amber-400 text-amber-500")} aria-hidden="true" />
      {active ? "Favourited" : "Favourite"}
    </button>
  );
}

/**
 * Standard page frame for every HMS screen: a premium header band with
 * breadcrumbs, title, description, favourite toggle and page actions,
 * plus consistent max widths.
 */
export default function PageContainer({
  title,
  description,
  eyebrow,
  icon,
  actions,
  favorite,
  children,
  maxWidth = "max-w-[1400px]",
}) {
  const favorites = useSyncExternalStore(
    subscribeLauncherStorage,
    getMenuFavoritesSnapshot,
    getServerMenuFavoritesSnapshot
  );

  const recentEntry = favorite
    ? {
        id: favorite.id,
        path: favorite.path,
        title: favorite.title,
        module: favorite.module ?? "",
      }
    : null;

  return (
    <div className={cn("mx-auto w-full px-3 pb-4 pt-4 sm:px-4 lg:px-6 xl:px-8", maxWidth)}>
      <RecentTracker entry={recentEntry} />

      <header className="relative overflow-hidden rounded-xl border border-ink-200 bg-panel shadow-[var(--shadow-card)]">
        <span
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-700"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-brand-50"
          aria-hidden="true"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
            <div className="mt-2 flex items-center gap-3">
              {icon ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_20px_-10px_rgba(29,111,245,0.9)]">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0">
                {eyebrow ? (
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] dark:text-brand-400 text-brand-600">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[24px]">
                  {title}
                </h1>
              </div>
            </div>
            {description ? (
              <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink-500">
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {favorite ? <FavoriteButton entry={favorite} favorites={favorites} /> : null}
            {actions}
          </div>
        </div>
      </header>

      <div className="mt-4">{children}</div>
    </div>
  );
}
