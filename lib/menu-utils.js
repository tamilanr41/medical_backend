import { MENU, MENU_BY_SLUG } from "@/config/menu";
import { canAccessModule } from "@/config/permissions";

/**
 * Pure helpers over the central menu configuration (§21).
 * Safe to import from server components, client components and tests.
 */

export function modulePath(mod) {
  return `/${mod.slug}`;
}

export function categoryPath(mod, category) {
  return `/${mod.slug}/${category.slug}`;
}

export function itemPath(mod, category, item) {
  return `/${mod.slug}/${category.slug}/${item.slug}`;
}

/** Stable item id: `{moduleId}.{categorySlug}.{itemSlug}` (§21). */
export function itemId(mod, category, item) {
  return `${mod.id}.${category.slug}.${item.slug}`;
}

/** Flat list of every menu item with its module/category context. */
export function flattenMenu() {
  const rows = [];
  for (const mod of MENU) {
    for (const category of mod.categories) {
      for (const item of category.items) {
        rows.push({
          id: itemId(mod, category, item),
          path: itemPath(mod, category, item),
          title: item.title,
          screen: item.screen,
          module: mod,
          category: category,
          item: item,
        });
      }
    }
  }
  return rows;
}

export function findItemById(id) {
  return flattenMenu().find((row) => row.id === id) ?? null;
}

/**
 * Resolves URL segments `["pharmacy", "sales", "sales-invoice"]` to
 * `{ module, category, item }` objects from the menu config.
 * Returns `null` when the path does not match the menu (legacy routes,
 * settings, profile, ...).
 */
export function resolveRoute(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const mod = MENU_BY_SLUG.get(segments[0]);
  if (!mod) return null;

  const resolved = { module: mod, category: null, item: null };

  if (segments.length >= 2) {
    const category = mod.categories.find((c) => c.slug === segments[1]);
    if (!category) return null;
    resolved.category = category;

    if (segments.length >= 3) {
      const item = category.items.find((i) => i.slug === segments[2]);
      if (!item) return null;
      resolved.item = item;
    }
    if (segments.length > 3) return null;
  }

  return resolved;
}

/** Menu annotated with role access flags for the sidebar / search. */
export function getMenuForRole(role) {
  return MENU.map((mod) => ({ ...mod, allowed: canAccessModule(role, mod.id) }));
}

/**
 * Supporting collections that are read/written by transaction screens but are
 * not themselves behind a menu item (e.g. the appointment scheduling grid
 * reads doctor sessions and blocked ranges). Keyed by module id so role access
 * is inherited from that module.
 */
const SUPPORTING_COLLECTIONS = {
  op_doctor_schedules: 101,
  op_appointment_blocks: 101,
};

/** Module ids (from the menu) that expose a given Mongo collection. */
const collectionModuleCache = new Map();

export function modulesForCollection(collection) {
  if (collectionModuleCache.has(collection)) {
    return collectionModuleCache.get(collection);
  }
  const ids = new Set();
  if (SUPPORTING_COLLECTIONS[collection] !== undefined) {
    ids.add(SUPPORTING_COLLECTIONS[collection]);
  }
  for (const mod of MENU) {
    for (const category of mod.categories) {
      for (const item of category.items) {
        if (item.screen.collection === collection) ids.add(mod.id);
      }
    }
  }
  collectionModuleCache.set(collection, ids);
  return ids;
}

/** True when the role may use the screens backed by a collection. */
export function canAccessCollection(role, collection) {
  const ids = modulesForCollection(collection);
  if (ids.size === 0) return false;
  for (const id of ids) {
    if (canAccessModule(role, id)) return true;
  }
  return false;
}

/** Primary menu module that exposes a collection (for audit records). */
export function primaryModuleForCollection(collection) {
  const ids = modulesForCollection(collection);
  const firstId = ids.values().next().value;
  if (firstId === undefined) return null;
  return MENU.find((mod) => mod.id === firstId) ?? null;
}

/** Breadcrumb trail for a pathname (server or client). */
export function buildBreadcrumbs(pathname, labels = {}) {
  const crumbs = [{ label: labels.home ?? "Home", href: "/home" }];
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return crumbs;

  const resolved = resolveRoute(segments);
  if (!resolved) {
    for (const segment of segments) {
      const label = labels[segment];
      crumbs.push({
        label: label ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        href: null,
      });
    }
    crumbs[crumbs.length - 1].href = null;
    return crumbs;
  }

  crumbs.push({ label: resolved.module.title, href: modulePath(resolved.module) });
  if (resolved.category) {
    crumbs.push({
      label: resolved.category.title,
      href: categoryPath(resolved.module, resolved.category),
    });
  }
  if (resolved.item) {
    crumbs.push({
      label: resolved.item.title,
      href: itemPath(resolved.module, resolved.category, resolved.item),
    });
  }
  return crumbs;
}

/** Ranked menu search across titles for the global palette (§21). */
export function searchMenu(role, query, limit = 14) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];

  const scored = [];
  for (const mod of getMenuForRole(role)) {
    if (!mod.allowed) continue;

    const moduleScore = rank(mod.title.toLowerCase(), q);
    if (moduleScore > 0) {
      scored.push({
        id: `${mod.id}`,
        path: modulePath(mod),
        title: mod.title,
        subtitle: `Module ${mod.id}`,
        group: "Modules",
        score: moduleScore,
      });
    }

    for (const category of mod.categories) {
      const categoryScore = rank(category.title.toLowerCase(), q);
      if (categoryScore > 0 && category.items.length > 0) {
        scored.push({
          id: `${mod.id}.${category.slug}`,
          path: categoryPath(mod, category),
          title: category.title,
          subtitle: mod.title,
          group: "Categories",
          score: categoryScore - 0.25,
        });
      }

      for (const item of category.items) {
        const score = Math.max(
          rank(item.title.toLowerCase(), q),
          rank(`${mod.title} ${category.title} ${item.title}`.toLowerCase(), q) * 0.7
        );
        if (score > 0) {
          scored.push({
            id: itemId(mod, category, item),
            path: itemPath(mod, category, item),
            title: item.title,
            subtitle: `${mod.title} › ${category.title}`,
            group: "Menu",
            score,
          });
        }
      }
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function rank(text, query) {
  if (text === query) return 3;
  if (text.startsWith(query)) return 2.4;
  if (text.split(/\s+/).some((word) => word.startsWith(query))) return 1.8;
  if (text.includes(query)) return 1.2;
  return 0;
}
