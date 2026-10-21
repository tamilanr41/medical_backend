"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration-safe clock: null on the server and during hydration, then a
 * Date ticking once per second on the client. Backed by a single interval
 * shared by every subscriber.
 */
let clockValue = 0;
let clockTimer = null;
const clockListeners = new Set();

function subscribeClock(callback) {
  clockListeners.add(callback);
  if (clockTimer === null) {
    clockValue = Date.now();
    clockTimer = window.setInterval(() => {
      clockValue = Date.now();
      for (const listener of clockListeners) listener();
    }, 1000);
  }
  return () => {
    clockListeners.delete(callback);
    if (clockListeners.size === 0 && clockTimer !== null) {
      window.clearInterval(clockTimer);
      clockTimer = null;
      clockValue = 0;
    }
  };
}

function getClockSnapshot() {
  return clockValue;
}

function getServerClockSnapshot() {
  return 0;
}

export function useNow() {
  const value = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getServerClockSnapshot
  );
  return value === 0 ? null : new Date(value);
}
