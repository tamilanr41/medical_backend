"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, FlaskConical, Bed, Pill } from "lucide-react";

const NOTIFICATIONS = [
  {
    id: 1,
    icon: FlaskConical,
    title: "12 lab reports awaiting validation",
    meta: "Pathology Â· 6 minutes ago",
    unread: true,
  },
  {
    id: 2,
    icon: Bed,
    title: "Ward B occupancy reached 92%",
    meta: "In Patient Â· 21 minutes ago",
    unread: true,
  },
  {
    id: 3,
    icon: Pill,
    title: "18 medicine batches expire within 30 days",
    meta: "Pharmacy Â· 1 hour ago",
    unread: false,
  },
];

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const unreadCount = NOTIFICATIONS.filter((item) => item.unread).length;

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

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Notifications, ${unreadCount} unread`}
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-navy-700"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Notifications"
          className="anim-pop absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-panel shadow-[0_24px_50px_-24px_rgba(16,31,53,0.4)]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <span className="text-[11px] font-medium text-slate-400">
              {unreadCount} unread
            </span>
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {NOTIFICATIONS.map((item) => (
              <li key={item.id}>
                <div className="flex gap-3 px-4 py-3 transition hover:bg-slate-50">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-600">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-start gap-2">
                      <span className="text-[13px] font-medium leading-snug text-slate-800">
                        {item.title}
                      </span>
                      {item.unread ? (
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-500"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-slate-400">
                      {item.meta}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

