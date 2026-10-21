/**
 * Browser storage helpers for launcher state (favorites, recently used
 * modules and user preferences). All access is guarded so the module can be
 * imported safely from Server Components.
 */

export const STORAGE_KEYS = {
  favorites: "hms.favorites.v1",
  recents: "hms.recents.v1",
  preferences: "hms.preferences.v1",
  menuFavorites: "hms.menu.favorites.v1",
  menuRecents: "hms.menu.recents.v1",
};

export const MAX_RECENTS = 5;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readJSON(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    invalidateSnapshots();
    window.dispatchEvent(new CustomEvent("hms-storage", { detail: { key } }));
  } catch {
    /* storage full or unavailable - degrade silently */
  }
}

/* --------------------- Reactive snapshot (client) --------------------- */
/*
 * useSyncExternalStore integration so components re-render when launcher
 * storage changes (including writes from other components or tabs).
 * Snapshots are cached and only recomputed after invalidation so React
 * sees a stable reference between notifications.
 */

let favoritesCache = null;
let recentsCache = null;
let preferencesCache = null;
let menuFavoritesCache = null;
let menuRecentsCache = null;

function invalidateSnapshots() {
  favoritesCache = null;
  recentsCache = null;
  preferencesCache = null;
  menuFavoritesCache = null;
  menuRecentsCache = null;
}

export function subscribeLauncherStorage(callback) {
  const handler = () => {
    invalidateSnapshots();
    callback();
  };
  window.addEventListener("hms-storage", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("hms-storage", handler);
    window.removeEventListener("storage", handler);
  };
}

export function getFavoritesSnapshot() {
  if (favoritesCache === null) favoritesCache = getFavorites();
  return favoritesCache;
}

export function getRecentsSnapshot() {
  if (recentsCache === null) recentsCache = getRecents();
  return recentsCache;
}

export function getPreferencesSnapshot() {
  if (preferencesCache === null) preferencesCache = getPreferences();
  return preferencesCache;
}

export function getMenuFavoritesSnapshot() {
  if (menuFavoritesCache === null) menuFavoritesCache = getMenuFavorites();
  return menuFavoritesCache;
}

export function getMenuRecentsSnapshot() {
  if (menuRecentsCache === null) menuRecentsCache = getMenuRecents();
  return menuRecentsCache;
}

const SERVER_FAVORITES = [];
const SERVER_RECENTS = [];

export function getServerFavoritesSnapshot() {
  return SERVER_FAVORITES;
}

export function getServerRecentsSnapshot() {
  return SERVER_RECENTS;
}

export function getServerPreferencesSnapshot() {
  return DEFAULT_PREFERENCES;
}

const SERVER_MENU_FAVORITES = [];
const SERVER_MENU_RECENTS = [];

export function getServerMenuFavoritesSnapshot() {
  return SERVER_MENU_FAVORITES;
}

export function getServerMenuRecentsSnapshot() {
  return SERVER_MENU_RECENTS;
}

/* ----------------------------- Favorites ----------------------------- */

export function getFavorites() {
  const ids = readJSON(STORAGE_KEYS.favorites, []);
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "number") : [];
}

export function toggleFavorite(moduleId) {
  const favorites = getFavorites();
  const next = favorites.includes(moduleId)
    ? favorites.filter((id) => id !== moduleId)
    : [moduleId, ...favorites];
  writeJSON(STORAGE_KEYS.favorites, next);
  return next;
}

export function clearFavorites() {
  writeJSON(STORAGE_KEYS.favorites, []);
}

/* --------------------------- Recently used --------------------------- */

export function getRecents() {
  const recents = readJSON(STORAGE_KEYS.recents, []);
  if (!Array.isArray(recents)) return [];
  return recents.filter(
    (entry) =>
      entry &&
      typeof entry.id === "number" &&
      typeof entry.name === "string" &&
      typeof entry.timestamp === "number"
  );
}

export function pushRecent(module) {
  const entry = {
    id: module.id,
    name: module.name,
    route: module.route,
    timestamp: Date.now(),
  };
  const next = [
    entry,
    ...getRecents().filter((item) => item.id !== module.id),
  ].slice(0, MAX_RECENTS);
  writeJSON(STORAGE_KEYS.recents, next);
  return next;
}

export function clearRecents() {
  writeJSON(STORAGE_KEYS.recents, []);
}

/* ----------------------- Menu favourites / recents --------------------- */

export function getMenuFavorites() {
  const ids = readJSON(STORAGE_KEYS.menuFavorites, []);
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
}

export function isMenuFavorite(id) {
  return getMenuFavorites().includes(id);
}

export function toggleMenuFavorite(id) {
  const favorites = getMenuFavorites();
  const next = favorites.includes(id)
    ? favorites.filter((entry) => entry !== id)
    : [id, ...favorites];
  writeJSON(STORAGE_KEYS.menuFavorites, next.slice(0, 20));
  return next;
}

export function clearMenuFavorites() {
  writeJSON(STORAGE_KEYS.menuFavorites, []);
}

export function getMenuRecents() {
  const entries = readJSON(STORAGE_KEYS.menuRecents, []);
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (entry) =>
      entry &&
      typeof entry.id === "string" &&
      typeof entry.path === "string" &&
      typeof entry.title === "string" &&
      typeof entry.timestamp === "number"
  );
}

export function pushMenuRecent(entry) {
  const next = [
    entry,
    ...getMenuRecents().filter((row) => row.id !== entry.id),
  ].slice(0, MAX_RECENTS + 3);
  writeJSON(STORAGE_KEYS.menuRecents, next);
  return next;
}

export function clearMenuRecents() {
  writeJSON(STORAGE_KEYS.menuRecents, []);
}

/* ---------------------------- Preferences ---------------------------- */

export const DEFAULT_PREFERENCES = {
  defaultCategory: "all",
  showModuleIds: true,
  emailAlerts: true,
};

export function getPreferences() {
  const prefs = readJSON(STORAGE_KEYS.preferences, {});
  return { ...DEFAULT_PREFERENCES, ...(prefs && typeof prefs === "object" ? prefs : {}) };
}

export function setPreference(key, value) {
  const next = { ...getPreferences(), [key]: value };
  writeJSON(STORAGE_KEYS.preferences, next);
  return next;
}

export function resetLauncherState() {
  clearFavorites();
  clearRecents();
  clearMenuFavorites();
  clearMenuRecents();
}
