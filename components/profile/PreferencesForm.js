"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, Check, RotateCcw, Star, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { CATEGORIES } from "@/config/modules";
import {
  clearFavorites,
  clearRecents,
  getFavoritesSnapshot,
  getPreferencesSnapshot,
  getRecentsSnapshot,
  getServerFavoritesSnapshot,
  getServerPreferencesSnapshot,
  getServerRecentsSnapshot,
  setPreference,
  subscribeLauncherStorage,
} from "@/lib/storage";

const TOGGLE_CLASSES =
  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500";

export default function PreferencesForm() {
  const preferences = useSyncExternalStore(
    subscribeLauncherStorage,
    getPreferencesSnapshot,
    getServerPreferencesSnapshot
  );
  const favorites = useSyncExternalStore(
    subscribeLauncherStorage,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const recents = useSyncExternalStore(
    subscribeLauncherStorage,
    getRecentsSnapshot,
    getServerRecentsSnapshot
  );
  const [status, setStatus] = useState("");

  function update(key, value) {
    setPreference(key, value);
    setStatus("Preference saved.");
  }

  function handleClear(kind) {
    if (kind === "favorites") {
      clearFavorites();
      setStatus("Favorites cleared.");
    } else {
      clearRecents();
      setStatus("Recently used modules cleared.");
    }
  }

  return (
    <div className="anim-fade-up space-y-5">
      <section
        aria-labelledby="launcher-prefs"
        className="rounded-xl border border-slate-200 bg-panel p-6"
      >
        <h2 id="launcher-prefs" className="text-[15px] font-semibold text-slate-900">
          Module launcher
        </h2>

        <div className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="default-category"
              className="mb-1.5 block text-[13px] font-semibold text-slate-700"
            >
              Default category on Home
            </label>
            <select
              id="default-category"
              value={preferences.defaultCategory}
              onChange={(event) => update("defaultCategory", event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-panel px-3 text-sm text-slate-900 outline-none transition focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
            >
              <option value="all">All modules</option>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12.5px] text-slate-500">
              Used when the Home page is opened without an explicit category.
            </p>
          </div>

          <PreferenceToggle
            id="show-module-ids"
            checked={preferences.showModuleIds}
            onChange={(value) => update("showModuleIds", value)}
            label="Show application reference IDs on module cards"
            description="Displays the legacy module reference (e.g. 101, 113) on each launcher card."
          />

          <PreferenceToggle
            id="email-alerts"
            checked={preferences.emailAlerts}
            onChange={(value) => update("emailAlerts", value)}
            icon={Bell}
            label="Email notifications"
            description="Receive digest emails for pending approvals, low stock and lab validations."
          />
        </div>
      </section>

      <section
        aria-labelledby="local-data"
        className="rounded-xl border border-slate-200 bg-panel p-6"
      >
        <h2 id="local-data" className="text-[15px] font-semibold text-slate-900">
          Local launcher data
        </h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Favorites and recently used modules are stored in this browser only.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
              Favorites
            </p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              {favorites.length} saved module{favorites.length === 1 ? "" : "s"}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={favorites.length === 0}
              onClick={() => handleClear("favorites")}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear favorites
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
              <RotateCcw className="h-4 w-4 text-navy-500" aria-hidden="true" />
              Recently used
            </p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              {recents.length} entr{recents.length === 1 ? "y" : "ies"} stored
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={recents.length === 0}
              onClick={() => handleClear("recents")}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear history
            </Button>
          </div>
        </div>
      </section>

      <p
        role="status"
        aria-live="polite"
        className={`text-[13px] font-medium ${status ? "text-emerald-600" : "text-transparent"}`}
      >
        {status || "Preferences are up to date."}
      </p>
    </div>
  );
}

function PreferenceToggle({
  id,
  checked,
  onChange,
  label,
  description,
  icon: Icon,
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-700">
          {Icon ? <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
          {label}
        </label>
        <p className="mt-0.5 text-[12.5px] text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`${TOGGLE_CLASSES} ${
          checked ? "bg-navy-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-panel shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        >
          {checked ? (
            <Check className="h-3 w-3 text-navy-700" aria-hidden="true" />
          ) : null}
        </span>
      </button>
    </div>
  );
}

