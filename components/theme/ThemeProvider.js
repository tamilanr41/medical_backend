"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  storeTheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

const CHANGE_EVENT = "hms-theme-change";

function subscribe(callback) {
  if (typeof window === "undefined") return () => {};
  const sync = () => {
    applyTheme(resolveTheme(getStoredTheme()));
    callback();
  };
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (event) => {
    if (!event.key || event.key === THEME_STORAGE_KEY) sync();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, sync);
  mq.addEventListener("change", sync);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, sync);
    mq.removeEventListener("change", sync);
  };
}

function getSnapshot() {
  return resolveTheme(getStoredTheme());
}

function getPreference() {
  return getStoredTheme();
}

const getServerSnapshot = () => "light";
const getServerPreference = () => "system";

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export default function ThemeProvider({ children }) {
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const theme = useSyncExternalStore(
    subscribe,
    getPreference,
    getServerPreference
  );

  const setTheme = useCallback((next) => {
    if (!["light", "dark", "system"].includes(next)) return;
    storeTheme(next);
    applyTheme(resolveTheme(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolveTheme(getStoredTheme()) === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
