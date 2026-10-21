"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Home,
  LayoutDashboard,
  ListOrdered,
  Lock,
  LogOut,
  Settings,
  Star,
  UserRound,
  X,
} from "lucide-react";
import {
  Ambulance,
  Bed,
  BedDouble,
  Boxes,
  Droplet,
  Droplets,
  FlaskConical,
  FolderOpen,
  Glasses,
  Hospital,
  Landmark,
  Package,
  PersonStanding,
  Pill,
  Radiation,
  Scan,
  Shield,
  ShieldCheck,
  ShoppingCart,
  SprayCan,
  Syringe,
  TestTube,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Logo from "./Logo";
import { HOSPITAL } from "@/config/modules";
import { findItemById, getMenuForRole } from "@/lib/menu-utils";
import {
  getMenuFavoritesSnapshot,
  getMenuRecentsSnapshot,
  getServerMenuFavoritesSnapshot,
  getServerMenuRecentsSnapshot,
  subscribeLauncherStorage,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

const ICONS = {
  Ambulance,
  Bed,
  BedDouble,
  Boxes,
  Droplet,
  Droplets,
  FlaskConical,
  FolderOpen,
  Glasses,
  Hospital,
  Landmark,
  Package,
  PersonStanding,
  Pill,
  Radiation,
  Scan,
  Shield,
  ShieldCheck,
  ShoppingCart,
  SprayCan,
  Syringe,
  TestTube,
  Users,
  UtensilsCrossed,
};

function rowClass({ active, allowed = true, level = 0 }) {
  return cn(
    "flex w-full items-center gap-2.5 rounded-lg text-[13.5px] font-medium transition",
    level === 0 ? "px-3 py-2.5" : level === 1 ? "px-2.5 py-2" : "px-2 py-1.5",
    active
      ? "bg-navy-50 text-navy-800"
      : allowed
        ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        : "text-slate-400"
  );
}

function ToggleButton({ open, label, onClick, level }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600",
        level === 0 ? "" : "rounded-md"
      )}
    >
      <ChevronDown
        className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        aria-hidden="true"
      />
    </button>
  );
}

function QuickLink({ href, icon: Icon, label, active, onClick, badge }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={rowClass({ active, level: 0 })}
    >
      <Icon
        className={cn("h-[17px] w-[17px]", active ? "text-navy-600" : "text-slate-400")}
        aria-hidden="true"
      />
      <span className="flex-1 text-left">{label}</span>
      {badge}
    </Link>
  );
}

function SavedItemRow({ id, onClick, icon: Icon }) {
  const entry = findItemById(id);
  if (!entry) return null;

  return (
    <Link
      href={entry.path}
      onClick={onClick}
      className={cn(rowClass({ level: 2, allowed: true }), "group")}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
      <span className="truncate">{entry.title}</span>
    </Link>
  );
}

/**
 * Hierarchical navigation drawer built entirely from config/menu.js (Â§21):
 * module â†’ category â†’ menu item, filtered by the signed-in role, with
 * favourites and recently-used menu screens pinned on top.
 */
export default function Sidebar({ open, onClose, user }) {
  const pathname = usePathname();
  const router = useRouter();

  const menuFavorites = useSyncExternalStore(
    subscribeLauncherStorage,
    getMenuFavoritesSnapshot,
    getServerMenuFavoritesSnapshot
  );
  const menuRecents = useSyncExternalStore(
    subscribeLauncherStorage,
    getMenuRecentsSnapshot,
    getServerMenuRecentsSnapshot
  );

  const modules = getMenuForRole(user.role);
  const activeModule = modules.find(
    (mod) => pathname === `/${mod.slug}` || pathname.startsWith(`/${mod.slug}/`)
  );

  // User toggles layered over the "active module/category stays open" default.
  const [toggledModules, setToggledModules] = useState({});
  const [toggledCategories, setToggledCategories] = useState({});

  function toggleModule(slug) {
    setToggledModules((prev) => ({
      ...prev,
      [slug]: !(slug in prev ? prev[slug] : slug === activeModule?.slug),
    }));
  }

  function toggleCategory(key) {
    setToggledCategories((prev) => {
      const currentlyOpen = key in prev ? prev[key] : pathname.startsWith(key);
      return { ...prev, [key]: !currentlyOpen };
    });
  }

  const isModuleOpen = (slug) =>
    slug in toggledModules ? toggledModules[slug] : slug === activeModule?.slug;

  const isCategoryOpen = (key) =>
    key in toggledCategories ? toggledCategories[key] : pathname.startsWith(key);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const allowedCount = modules.filter((mod) => mod.allowed).length;

  return (
    <Drawer open={open} onClose={onClose} label="Primary navigation">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <div className="leading-tight">
            <p className="text-[13.5px] font-bold tracking-wide text-navy-900">
              ZHANX HMS
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Hospital Management System
            </p>
          </div>
        </div>
        <button
          type="button"
          data-drawer-close
          onClick={onClose}
          aria-label="Close navigation menu"
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <nav
        aria-label="Primary"
        className="scrollbar-slim flex-1 space-y-5 overflow-y-auto px-3 py-4"
      >
        <div className="space-y-1">
<QuickLink
            href="/home"
            icon={Home}
            label="Home"
            active={pathname === "/home"}
            onClick={onClose}
          />
          <QuickLink
            href="/today"
            icon={CalendarDays}
            label="Today"
            active={pathname === "/today"}
            onClick={onClose}
          />
          <QuickLink
            href="/waitlist"
            icon={ListOrdered}
            label="Waitlist"
            active={pathname === "/waitlist"}
            onClick={onClose}
          />
          <QuickLink
            href="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            active={pathname === "/dashboard"}
            onClick={onClose}
          />
          <QuickLink
            href="/profile"
            icon={UserRound}
            label="Profile"
            active={pathname.startsWith("/profile")}
            onClick={onClose}
          />
          <QuickLink
            href="/settings"
            icon={Settings}
            label="Settings"
            active={pathname.startsWith("/settings")}
            onClick={onClose}
          />
        </div>

        {menuFavorites.length > 0 ? (
          <div>
            <h2 className="flex items-center gap-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-amber-500">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              Favourites
            </h2>
            <div className="mt-1.5 space-y-0.5">
              {menuFavorites.map((id) => (
                <SavedItemRow key={id} id={id} onClick={onClose} icon={Star} />
              ))}
            </div>
          </div>
        ) : null}

        {menuRecents.length > 0 ? (
          <div>
            <h2 className="flex items-center gap-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Recently Used
            </h2>
            <div className="mt-1.5 space-y-0.5">
              {menuRecents.map((entry) => (
                <Link
                  key={entry.id}
                  href={entry.path}
                  onClick={onClose}
                  className={cn(rowClass({ level: 2, allowed: true }))}
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                  <span className="truncate">{entry.title}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <h2 className="flex items-center justify-between px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <span>Modules</span>
            <span className="font-semibold text-slate-300">
              {allowedCount}/{modules.length}
            </span>
          </h2>

          <ul className="mt-1.5 space-y-0.5">
            {modules.map((mod) => {
              const Icon = ICONS[mod.icon];
              const openState = isModuleOpen(mod.slug);
              const hasChildren = mod.categories.length > 0;
              const active =
                pathname === `/${mod.slug}` || pathname.startsWith(`/${mod.slug}/`);

              return (
                <li key={mod.slug}>
                  <div className="flex items-center gap-0.5">
                    {mod.allowed ? (
                      <Link
                        href={`/${mod.slug}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(rowClass({ active, level: 0 }), "min-w-0 flex-1")}
                      >
                        {Icon ? (
                          <Icon
                            className={cn(
                              "h-[17px] w-[17px] shrink-0",
                              active ? "text-navy-600" : "text-slate-400"
                            )}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="truncate">{mod.title}</span>
                      </Link>
                    ) : (
                      <span
                        title={`Not granted to ${user.roleLabel}`}
                        className={cn(rowClass({ level: 0, allowed: false }), "min-w-0 flex-1")}
                      >
                        {Icon ? (
                          <Icon className="h-[17px] w-[17px] shrink-0 text-slate-300" aria-hidden="true" />
                        ) : null}
                        <span className="truncate">{mod.title}</span>
                        <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                      </span>
                    )}

                    {hasChildren && mod.allowed ? (
                      <ToggleButton
                        open={openState}
                        label={mod.title}
                        onClick={() => toggleModule(mod.slug)}
                        level={0}
                      />
                    ) : null}
                  </div>

                  {mod.allowed && openState ? (
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">
                      {mod.categories.map((category) => {
                        const categoryKey = `/${mod.slug}/${category.slug}`;
                        const categoryActive =
                          pathname === categoryKey || pathname.startsWith(`${categoryKey}/`);
                        const categoryOpen = isCategoryOpen(categoryKey);

                        return (
                          <li key={category.slug}>
                            <div className="flex items-center gap-0.5">
                              <Link
                                href={categoryKey}
                                aria-current={categoryActive ? "page" : undefined}
                                className={cn(
                                  rowClass({ active: categoryActive, level: 1, allowed: true }),
                                  "min-w-0 flex-1"
                                )}
                              >
                                <span className="truncate">{category.title}</span>
                                {category.items.length === 0 ? (
                                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                                    soon
                                  </span>
                                ) : null}
                              </Link>

                              {category.items.length > 0 ? (
                                <ToggleButton
                                  open={categoryOpen}
                                  label={category.title}
                                  onClick={() => toggleCategory(categoryKey)}
                                  level={1}
                                />
                              ) : null}
                            </div>

                            {category.items.length > 0 && categoryOpen ? (
                              <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">
                                {category.items.map((item) => {
                                  const href = `${categoryKey}/${item.slug}`;
                                  const itemActive = pathname === href;

                                  return (
                                    <li key={item.slug}>
                                      <Link
                                        href={href}
                                        onClick={onClose}
                                        aria-current={itemActive ? "page" : undefined}
                                        className={cn(
                                          rowClass({ active: itemActive, level: 2, allowed: true })
                                        )}
                                      >
                                        <span className="truncate">{item.title}</span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <p className="mt-3 px-3 text-[11px] text-slate-400">
            {modules.length} hospital modules Â· menu as per legacy HMS
          </p>
        </div>

        <div className="space-y-1 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            Logout
          </button>
        </div>
      </nav>

      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-semibold text-white">
            {user.initials}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-800">
              {user.name}
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {user.roleLabel} Â· {HOSPITAL.campus}
            </p>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

