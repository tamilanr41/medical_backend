"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, Lock, Search, Settings } from "lucide-react";
import { getMenuForRole, searchMenu } from "@/lib/menu-utils";
import { pushMenuRecent } from "@/lib/storage";

/**
 * Global menu palette (Ctrl/âŒ˜ + K). Searches every menu item of the
 * central config/menu.js for the signed-in role â€” modules, categories and
 * screens â€” entirely client-side (Â§21).
 * Mounted only while open, so state starts fresh each time.
 */
export default function GlobalSearch({ user, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [query, setQuery] = useState("");
  // Selection is keyed by query so typing resets the highlight to the top
  // without needing an effect.
  const [selection, setSelection] = useState({ query: "", index: 0 });
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, []);

  const modules = useMemo(() => getMenuForRole(user.role), [user.role]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return modules
        .filter((mod) => mod.allowed)
        .slice(0, 8)
        .map((mod) => ({
          id: String(mod.id),
          path: `/${mod.slug}`,
          title: mod.title,
          subtitle: `Module ${mod.id}`,
          group: "Modules",
          score: 0,
        }));
    }
    return searchMenu(user.role, query);
  }, [query, user.role, modules]);

  const activeIndex =
    selection.query === query
      ? Math.min(selection.index, Math.max(results.length - 1, 0))
      : 0;

  function setActive(index) {
    setSelection({ query, index });
  }

  useEffect(() => {
    const option = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function openResult(entry) {
    if (!entry) return;
    if (entry.group === "Menu") {
      pushMenuRecent({
        id: entry.id,
        path: entry.path,
        title: entry.title,
        module: entry.subtitle ?? "",
        timestamp: Date.now(),
      });
    }
    onClose();
    router.push(entry.path);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(Math.min(activeIndex + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = results[activeIndex];
      if (entry) openResult(entry);
      else if (query.trim()) setStatus("No matching screens for your role.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] sm:p-6 sm:pt-[12vh]">
      <div
        className="anim-fade-in absolute inset-0 bg-navy-950/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search menu"
        className="anim-pop relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-panel shadow-[0_30px_60px_-25px_rgba(16,31,53,0.45)]"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setStatus("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search modules, screens, reports... (try 'sales', 'stock', 'file')"
            aria-label="Search the HMS menu"
            aria-controls="global-search-results"
            aria-activedescendant={
              results[activeIndex]
                ? `global-option-${results[activeIndex].group}-${results[activeIndex].id}`
                : undefined
            }
            role="combobox"
            aria-expanded="true"
            autoComplete="off"
            className="h-13 w-full bg-transparent py-4 text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 transition hover:bg-slate-50"
          >
            ESC
          </button>
        </div>

        <div
          id="global-search-results"
          ref={listRef}
          role="listbox"
          aria-label="Menu results"
          className="scrollbar-slim flex-1 overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No menu items match &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-[13px] text-slate-400">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Restricted screens are hidden for {user.roleLabel}.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map((entry, index) => (
                <li key={`${entry.group}-${entry.id}`} role="presentation">
                  <button
                    type="button"
                    id={`global-option-${entry.group}-${entry.id}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => openResult(entry)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      index === activeIndex
                        ? "bg-navy-50 ring-1 ring-navy-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel ring-1 ring-slate-200">
                      {entry.group === "Modules" ? (
                        <Settings className="h-4 w-4 text-navy-700" aria-hidden="true" />
                      ) : entry.group === "Categories" ? (
                        <Search className="h-4 w-4 text-navy-700" aria-hidden="true" />
                      ) : (
                        <Clock className="h-4 w-4 text-navy-700" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-semibold text-slate-800">
                          {entry.title}
                        </span>
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-500">
                          {entry.group}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-slate-400">
                        {entry.subtitle}
                      </span>
                    </span>
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 text-navy-500 transition ${
                        index === activeIndex ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
          <p
            aria-live="polite"
            className={`text-[12px] font-medium ${
              status ? "text-rose-600" : "text-slate-400"
            }`}
          >
            {status || "Search covers the full legacy menu for your role."}
          </p>
          <p className="hidden gap-3 text-[11px] text-slate-400 sm:flex">
            <span>
              <kbd className="font-mono font-semibold">â†‘â†“</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono font-semibold">â†µ</kbd> open
            </span>
            <span>
              <kbd className="font-mono font-semibold">esc</kbd> close
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

