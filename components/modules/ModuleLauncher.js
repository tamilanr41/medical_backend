"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Search, SearchX, X } from "lucide-react";
import ModuleGrid from "./ModuleGrid";
import WelcomeBanner from "./WelcomeBanner";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { CATEGORIES } from "@/config/modules";
import { filterModules, groupModulesByCategory } from "@/lib/module-utils";
import {
  getFavoritesSnapshot,
  getServerFavoritesSnapshot,
  pushRecent,
  subscribeLauncherStorage,
  toggleFavorite,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Home module launcher: welcome hero above all modules, with search and
 * category filters. Opening a module validates it, records it as recent
 * and navigates to its route.
 */
export default function ModuleLauncher({ user, modules, initialCategory = "all" }) {
  const router = useRouter();
  const searchRef = useRef(null);

  const [query, setQuery] = useState("");
  const [categoryChoice, setCategoryChoice] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [notice, setNotice] = useState(null);

  const favorites = useSyncExternalStore(
    subscribeLauncherStorage,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const notify = useCallback((type, message) => {
    setNotice({ type, message, key: Date.now() });
  }, []);

  const handleModuleClick = useCallback(
    (module) => {
      const target = modules.find((entry) => entry.id === module.id) ?? module;

      if (!target.enabled) {
        notify("error", "This module is currently unavailable.");
        return;
      }
      if (!target.allowed) {
        notify(
          "error",
          "You don't have permission to access this module. Contact your administrator."
        );
        return;
      }

      setActiveId(target.id);
      pushRecent(target);
      router.push(target.route);
    },
    [modules, notify, router]
  );

  const handleToggleFavorite = useCallback((module) => {
    toggleFavorite(module.id);
  }, []);

  const activeCategory =
    categoryChoice ?? (initialCategory !== "all" ? initialCategory : "all");

  const filteredModules = useMemo(() => {
    const byCategory =
      activeCategory === "all"
        ? modules
        : modules.filter((module) => module.category === activeCategory);
    return filterModules(byCategory, query);
  }, [modules, activeCategory, query]);

  const groups = useMemo(
    () => groupModulesByCategory(filteredModules),
    [filteredModules]
  );

  const categoryCounts = useMemo(() => {
    const counts = { all: modules.length };
    for (const entry of modules) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
    }
    return counts;
  }, [modules]);

  const isFiltering = Boolean(query.trim()) || categoryChoice !== null;

  return (
    <div className="space-y-6">
      <WelcomeBanner user={user} />

      <Breadcrumbs alwaysShow />

      {/* Header + search --------------------------------------------- */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[16px] font-bold tracking-tight text-ink-900">
            All Modules
          </h1>
          <span className="text-[12.5px] tabular-nums text-ink-500">
            {filteredModules.length} shown
          </span>
        </div>

        <div className="relative lg:w-80">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules..."
            aria-label="Search modules"
            className="h-11 w-full rounded-lg border border-ink-200 bg-panel pl-10 pr-16 text-[14px] text-ink-800 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {/* Category filter --------------------------------------------- */}
      <div
        role="group"
        aria-label="Filter modules by category"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
      >
        <button
          type="button"
          aria-pressed={categoryChoice === "all"}
          onClick={() => setCategoryChoice("all")}
        className={cn(
          "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
          categoryChoice === "all"
            ? "bg-brand-600 text-white"
            : "border border-ink-200 bg-panel text-ink-600 hover:bg-ink-50"
        )}
        >
          All
          <span className="ml-1.5 text-[10px] opacity-60">{categoryCounts.all}</span>
        </button>

        {CATEGORIES.map((entry) => {
          const active = categoryChoice === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategoryChoice(entry.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "border border-ink-200 bg-panel text-ink-600 hover:bg-ink-50"
              )}
            >
              {entry.label}
              <span className="ml-1.5 text-[10px] opacity-60">
                {categoryCounts[entry.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status notice ------------------------------------------------ */}
      <div aria-live="polite" role="status">
        {notice ? (
          <p
            key={notice.key}
            className={cn(
              "anim-fade-in flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium",
              notice.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-brand-200 bg-brand-50 text-brand-700"
            )}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {notice.message}
          </p>
        ) : null}
      </div>

      {/* Modules ------------------------------------------------------ */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 bg-panel px-6 py-16 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100">
            <SearchX className="h-5 w-5 text-ink-400" aria-hidden="true" />
          </span>
          <p className="mt-3 text-[13.5px] font-semibold text-ink-700">
            No modules found
          </p>
          <p className="mt-1 max-w-md text-[13px] text-ink-500">
            {isFiltering
              ? "No module matches the current search or category filter."
              : "No modules are assigned to your role yet."}
          </p>
          {isFiltering ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryChoice("all");
              }}
              className="mt-3 rounded-lg border border-ink-200 bg-panel px-3.5 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-ink-50"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <ModuleGrid
          groups={groups}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onOpen={handleModuleClick}
          activeId={activeId}
        />
      )}
    </div>
  );
}