/**
 * Theme helpers — safe for client and server. The resolved theme is applied by
 * toggling `.dark` on <html>; persistence uses localStorage so the choice
 * survives refreshes and navigation.
 */

export const THEME_STORAGE_KEY = "hms-theme";

export const THEME_MODES = ["light", "dark", "system"];

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function getStoredTheme() {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_MODES.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function storeTheme(theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function resolveTheme(theme) {
  return theme === "system" ? getSystemTheme() : theme;
}

/** Apply a resolved ("light" | "dark") theme, animating only the transition. */
export function applyTheme(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.classList.toggle("dark", resolved === "dark");
  window.clearTimeout(applyTheme._timer);
  applyTheme._timer = window.setTimeout(
    () => root.classList.remove("theme-transition"),
    260
  );
}

/** Inline script that sets the theme class before first paint (no flicker). */
export const NO_FLICKER_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var t=localStorage.getItem(k)||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(${DARK_QUERY})').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
