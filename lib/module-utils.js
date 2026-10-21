import {
  MODULES,
  CATEGORIES,
  CATEGORY_MAP,
  HOSPITAL,
} from "@/config/modules";

export function getModuleBySlug(slug) {
  if (!slug) return null;
  return MODULES.find((module) => module.slug === slug) ?? null;
}

export function getModuleByRoute(route) {
  if (!route) return null;
  return MODULES.find((module) => module.route === route) ?? null;
}

export function getModuleById(id) {
  return MODULES.find((module) => module.id === id) ?? null;
}

export function getCategory(id) {
  return CATEGORY_MAP[id] ?? null;
}

function normalise(value) {
  return String(value ?? "").toLowerCase().trim();
}

export function matchesQuery(module, query) {
  const needle = normalise(query);
  if (!needle) return true;

  const haystack = [
    module.name,
    module.shortName,
    module.description,
    getCategory(module.category)?.label,
    module.slug,
    String(module.id),
    ...(module.keywords ?? []),
  ]
    .map(normalise)
    .join(" ");

  return haystack.includes(needle);
}

/** Filters a module list across name, description, category, id and keywords. */
export function filterModules(modules, query) {
  if (!query || !query.trim()) return modules;
  return modules.filter((module) => matchesQuery(module, query));
}

/** Groups modules into ordered categories, dropping empty groups. */
export function groupModulesByCategory(modules) {
  return CATEGORIES.map((category) => ({
    category,
    modules: modules.filter((module) => module.category === category.id),
  })).filter((group) => group.modules.length > 0);
}

export function formatRelativeTime(timestamp, now = Date.now()) {
  if (!timestamp) return "";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export { HOSPITAL };
