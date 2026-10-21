"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  LogOut,
  Settings,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { href: "/profile", label: "Profile", icon: User },
  {
    href: "/profile/change-password",
    label: "Change Password",
    icon: KeyRound,
  },
  { href: "/profile/preferences", label: "Preferences", icon: SlidersHorizontal },
];

export default function UserMenu({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1.5 transition hover:border-slate-200 hover:bg-slate-50"
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[12px] font-semibold text-white">
          {user.initials}
        </span>
        <span className="hidden flex-col items-start leading-tight lg:flex">
          <span className="max-w-[140px] truncate text-[13px] font-semibold text-slate-800">
            {user.name}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {user.roleLabel}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={cn(
            "hidden h-4 w-4 text-slate-400 transition-transform duration-200 lg:block",
            open && "rotate-180"
          )}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="anim-pop absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-panel shadow-[0_24px_50px_-24px_rgba(16,31,53,0.4)]"
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-500">{user.designation}</p>
            <p className="mt-1 inline-flex items-center rounded-md bg-navy-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy-700">
              {user.roleLabel}
            </p>
          </div>

          <div className="p-1.5">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-slate-700 transition hover:bg-navy-50 hover:text-navy-800"
              >
                <item.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-slate-700 transition hover:bg-navy-50 hover:text-navy-800"
            >
              <Settings className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Settings
            </Link>
          </div>

          <div className="border-t border-slate-100 p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {loggingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

