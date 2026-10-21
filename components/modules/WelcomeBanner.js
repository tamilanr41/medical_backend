"use client";

import { Clock, Moon, Sun, Sunset } from "lucide-react";
import { HOSPITAL } from "@/config/modules";
import { useNow } from "@/lib/use-now";

function greetingForHour(hour) {
  if (hour < 12) return { label: "Good morning", Icon: Sun };
  if (hour < 17) return { label: "Good afternoon", Icon: Sunset };
  return { label: "Good evening", Icon: Moon };
}

function initialsForName(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/**
 * Home hero: deep blue gradient banner with greeting, avatar, identity
 * and live clock.
 */
export default function WelcomeBanner({ user }) {
  const now = useNow();

  const { label, Icon } = greetingForHour(now ? now.getHours() : 12);
  const meta = [user.roleLabel, user.designation, user.department]
    .filter(Boolean)
    .join(" · ");
  const initials = initialsForName(user.name);

  const timeLabel = now
    ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const dateLabel = now
    ? now.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })
    : "";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900 shadow-[0_18px_40px_-18px_rgba(29,111,245,0.65)]">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-brand-300/25 blur-3xl"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-brand-900/40 blur-3xl"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="anim-shine pointer-events-none absolute top-0 h-full w-36 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent motion-reduce:hidden" />
      </span>

      <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-5 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/30 to-white/10 text-[18px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(8,15,32,0.8)] ring-1 ring-white/25"
            aria-hidden="true"
          >
            {initials || "U"}
          </span>

          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-white/90 ring-1 ring-white/20">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              {HOSPITAL.name} · {HOSPITAL.campus}
            </p>
            <h1 className="mt-1.5 flex items-center gap-2 truncate text-[24px] font-bold tracking-tight text-white">
              <Icon className="h-5 w-5 shrink-0 text-brand-100" aria-hidden="true" />
              <span className="truncate">
                {label}, {user.name}
              </span>
            </h1>
            {meta ? <p className="mt-1 text-[13px] text-white/75">{meta}</p> : null}
          </div>
        </div>

        <div className="hidden rounded-xl bg-white/10 px-4 py-3 text-right ring-1 ring-white/20 backdrop-blur-sm sm:block">
          <p className="font-mono text-[25px] font-bold tabular-nums leading-none text-white">
            {timeLabel}
          </p>
          <p className="mt-1.5 flex items-center justify-end gap-1 text-[12px] font-medium text-white/70">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {dateLabel}
          </p>
        </div>
      </div>
    </section>
  );
}