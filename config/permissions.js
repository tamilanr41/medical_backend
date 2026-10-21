import { MODULES, CATEGORIES } from "./modules.js";

/**
 * Roles supported by the HMS shell.
 */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  DOCTOR: "DOCTOR",
  NURSE: "NURSE",
  RECEPTIONIST: "RECEPTIONIST",
  LAB_TECHNICIAN: "LAB_TECHNICIAN",
  PHARMACIST: "PHARMACIST",
  MRD_USER: "MRD_USER",
  BILLING_USER: "BILLING_USER",
  INSURANCE_USER: "INSURANCE_USER",
  HR_USER: "HR_USER",
  PURCHASE_USER: "PURCHASE_USER",
};

export const ROLE_LABELS = {
  SUPER_ADMIN: "Super Administrator",
  ADMIN: "Administrator",
  DOCTOR: "Doctor",
  NURSE: "Nursing Staff",
  RECEPTIONIST: "Receptionist",
  LAB_TECHNICIAN: "Laboratory Technician",
  PHARMACIST: "Pharmacist",
  MRD_USER: "MRD Officer",
  BILLING_USER: "Billing Executive",
  INSURANCE_USER: "Insurance Officer",
  HR_USER: "HR Executive",
  PURCHASE_USER: "Procurement Officer",
};

/**
 * How modules the current role cannot access are presented on the Home
 * launcher:
 *   - "disabled": cards stay visible in a locked/disabled state (default)
 *   - "hidden":   cards are removed from the launcher entirely
 */
export const MODULE_VISIBILITY = "disabled";

const ALL = ["*"];

const ALL_MODULE_IDS = MODULES.map((module) => module.id);

/**
 * Role -> module reference IDs the role may open.
 * Central permission map; swap for an API response when a backend is added.
 */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ALL,
  [ROLES.ADMIN]: ALL,

  [ROLES.DOCTOR]: [
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 113, 114, 117, 118,
  ],

  [ROLES.NURSE]: [101, 102, 103, 107, 108, 109, 110, 111, 113, 117, 118],

  [ROLES.RECEPTIONIST]: [101, 102, 109, 112, 113, 114, 115, 123],

  [ROLES.LAB_TECHNICIAN]: [103, 104, 105, 106, 110],

  [ROLES.PHARMACIST]: [113, 114, 117, 121, 122, 123],

  [ROLES.MRD_USER]: [110, 101, 102],

  [ROLES.BILLING_USER]: [101, 102, 103, 104, 105, 112, 113, 114, 123],

  [ROLES.INSURANCE_USER]: [101, 102, 110, 112, 123],

  [ROLES.HR_USER]: [120, 122],

  [ROLES.PURCHASE_USER]: [113, 121, 122],
};

/** Settings workspaces that require administrative privileges. */
export const ADMIN_ONLY_SETTINGS = ["users", "roles", "permissions", "system"];

export function canAccessModule(role, moduleId) {
  const granted = ROLE_PERMISSIONS[role];
  if (!granted) return false;
  if (granted.includes("*")) return true;
  return granted.includes(moduleId);
}

export function canAccessModuleList(role) {
  return ALL_MODULE_IDS.filter((id) => canAccessModule(role, id));
}

/**
 * Resolve the launcher payload for a role.
 * Returns module records annotated with `allowed`, honouring the
 * MODULE_VISIBILITY configuration.
 */
export function getModulesForRole(role) {
  const withFlags = MODULES.map((module) => ({
    ...module,
    allowed: canAccessModule(role, module.id),
  }));

  if (MODULE_VISIBILITY === "hidden") {
    return withFlags.filter((module) => module.allowed);
  }

  return withFlags;
}

export function getCategoriesWithCounts(role) {
  const modules = getModulesForRole(role);
  return CATEGORIES.map((category) => ({
    ...category,
    total: MODULES.filter((module) => module.category === category.id).length,
    visible: modules.filter((module) => module.category === category.id).length,
  }));
}
