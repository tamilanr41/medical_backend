"use client";

import Link from "next/link";
import { Menu, Search, Settings } from "lucide-react";
import Logo from "./Logo";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { HOSPITAL } from "@/config/modules";
import { useNow } from "@/lib/use-now";

function Clock() {
  const now = useNow();

  if (!now) {
    return (
      <div
        className="hidden flex-col items-end leading-tight xl:flex"
        aria-hidden="true"
      >
        <span className="text-[13px] font-semibold tabular-nums text-ink-300">
          --:--:--
        </span>
        <span className="text-[11px] font-medium text-ink-300">syncing...</span>
      </div>
    );
  }

  return (
    <div className="hidden flex-col items-end leading-tight xl:flex">
      <time
        dateTime={now.toISOString()}
        className="text-[13px] font-semibold tabular-nums text-ink-700"
      >
        {now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </time>
      <span className="text-[11px] font-medium text-ink-400">
        {now.toLocaleDateString([], {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
    </div>
  );
}

export default function Header({ user, onMenuClick, onSearchClick }) {
  return (
    <header className="sticky top-3 z-40 mx-auto w-full max-w-[1600px] px-2 sm:px-4">
      <div className="relative flex h-16 items-center gap-2 rounded-2xl border border-ink-200/70 bg-panel/90 px-3 shadow-[var(--shadow-card)] backdrop-blur-xl sm:gap-3 sm:px-4 lg:px-5">
        <span
          className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-brand-400 via-brand-600 to-brand-700"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-xl p-2 text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <Link
          href="/home"
          className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:bg-brand-50/60"
          aria-label={`${HOSPITAL.shortName} home`}
        >
          <Logo className="h-9 w-9 shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-extrabold tracking-tight text-ink-900">
              ZHANX{" "}
              <span className="bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
                HMS
              </span>
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400 sm:block">
              Hospital Management System
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={onSearchClick}
          className="mx-auto hidden w-full max-w-sm items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/80 px-3 py-2 text-left text-[13px] text-ink-400 transition hover:border-brand-200 hover:bg-panel md:flex lg:max-w-md"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="flex-1">Search modules, services, settings...</span>
          <kbd className="rounded-md border border-ink-200 bg-panel px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-400">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Clock />

          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search modules"
            className="rounded-xl p-2 text-ink-500 transition hover:bg-brand-50 hover:text-brand-700 md:hidden"
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>

          <ThemeToggle />
          <NotificationsMenu />

          <Link
            href="/settings"
            aria-label="Settings"
            className="hidden rounded-xl p-2 text-ink-500 transition hover:bg-brand-50 hover:text-brand-700 sm:block"
          >
            <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
          </Link>

          <span
            className="mx-1 hidden h-6 w-px bg-ink-200 sm:block"
            aria-hidden="true"
          />

          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}