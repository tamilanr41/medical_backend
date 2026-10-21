import {
  BedDouble,
  Boxes,
  Building2,
  FlaskConical,
  Flower2,
  Handshake,
  LayoutGrid,
  Pill,
  Receipt,
  Refrigerator,
  Scan,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

/**
 * Admin settings navigation structure.
 * Each entry is a real route (`/settings/[slug]`) ready for future CRUD
 * implementation.
 */
export const SETTINGS_CATEGORIES = [
  {
    slug: "hospital",
    name: "Hospital Information",
    icon: Building2,
    description:
      "Hospital identity, branches, contact details, signage and letterheads.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Hospital name, logo and address",
      "Contact numbers, email and website",
      "Registration and license numbers",
      "Letterhead and invoice footers",
    ],
  },
  {
    slug: "users",
    name: "Users",
    icon: Users,
    description:
      "Staff login accounts, status, assignments and password policies.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Create, edit and deactivate users",
      "Department and reporting assignments",
      "Login history and active sessions",
      "Password and account lock policies",
    ],
  },
  {
    slug: "roles",
    name: "Roles",
    icon: ShieldCheck,
    description:
      "Role catalogue used across the application permission model.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Create and rename roles",
      "Role descriptions and seniority levels",
      "Default module access templates",
    ],
  },
  {
    slug: "permissions",
    name: "Permissions",
    icon: LayoutGrid,
    description:
      "Role to module access matrix, including visibility behaviour.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Module access matrix per role",
      "Disabled vs hidden module policy",
      "Action level permissions (view, edit, approve)",
    ],
  },
  {
    slug: "departments",
    name: "Departments",
    icon: Building2,
    description:
      "Clinical and non-clinical departments, cost centres and heads.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Department catalogue and code",
      "Head of department and location",
      "Cost centre and revenue mapping",
    ],
  },
  {
    slug: "doctors",
    name: "Doctors",
    icon: Stethoscope,
    description:
      "Consultant registry, schedules, fee structures and credentials.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Doctor profiles and credentials",
      "Consultation schedules and rooms",
      "Fee structures and revenue share rules",
    ],
  },
  {
    slug: "specialties",
    name: "Specialties",
    icon: Flower2,
    description:
      "Medical specialties, sub-specialties and service line mapping.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Specialty and sub-specialty list",
      "Service line mapping",
      "Referral routing defaults",
    ],
  },
  {
    slug: "medicines",
    name: "Medicines",
    icon: Pill,
    description:
      "Medicine master, formulations, HSN codes and pricing bands.",
    managedBy: ["SUPER_ADMIN", "ADMIN", "PHARMACIST"],
    fields: [
      "Generic and brand names, formulations",
      "Manufacturer, HSN and tax configuration",
      "Purchase / retail price bands",
    ],
  },
  {
    slug: "laboratory-tests",
    name: "Laboratory Tests",
    icon: FlaskConical,
    description:
      "Investigation catalogue, panels, reference ranges and departments.",
    managedBy: ["SUPER_ADMIN", "ADMIN", "LAB_TECHNICIAN"],
    fields: [
      "Test catalogue, codes and departments",
      "Panels and automated profiles",
      "Reference ranges by age and gender",
    ],
  },
  {
    slug: "radiology-tests",
    name: "Radiology Tests",
    icon: Scan,
    description:
      "X-Ray, CT, MRI and specialty imaging procedure master.",
    managedBy: ["SUPER_ADMIN", "ADMIN", "LAB_TECHNICIAN"],
    fields: [
      "Procedure list by modality",
      "Contrast and protocol defaults",
      "Turnaround times and reporting templates",
    ],
  },
  {
    slug: "rooms",
    name: "Rooms",
    icon: BedDouble,
    description:
      "Rooms, categories, tariffs and current occupancy configuration.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Room numbering and categories",
      "Tariff plans and surge pricing",
      "Occupancy and housekeeping status",
    ],
  },
  {
    slug: "wards",
    name: "Wards",
    icon: BedDouble,
    description:
      "Ward master, specialties served and nursing unit mapping.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Ward list and specialties served",
      "Nursing units and floor mapping",
      "Visiting hours and restrictions",
    ],
  },
  {
    slug: "beds",
    name: "Beds",
    icon: BedDouble,
    description:
      "Bed inventory, types, tariffs and occupancy rules per ward.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Bed numbering and types",
      "Ward mapping and tariffs",
      "Critical care and isolation flags",
    ],
  },
  {
    slug: "billing-masters",
    name: "Billing Masters",
    icon: Receipt,
    description:
      "Service items, packages, tax heads and charge structures.",
    managedBy: ["SUPER_ADMIN", "ADMIN", "BILLING_USER"],
    fields: [
      "Service and package catalogue",
      "Charge heads, taxes and discounts",
      "Package inclusions and exclusions",
    ],
  },
  {
    slug: "insurance-companies",
    name: "Insurance Companies",
    icon: Handshake,
    description:
      "TPA and insurer master, policy rules and claim formats.",
    managedBy: ["SUPER_ADMIN", "ADMIN", "INSURANCE_USER"],
    fields: [
      "Insurer and TPA profiles",
      "Policy, network and package rules",
      "Claim formats and query reasons",
    ],
  },
  {
    slug: "suppliers",
    name: "Suppliers",
    icon: Boxes,
    description:
      "Vendor master, contracts, lead times and payment terms.",
    managedBy: ["SUPER_ADMIN", "ADMIN", "PURCHASE_USER"],
    fields: [
      "Supplier profiles and GST details",
      "Contracts and rate agreements",
      "Lead times and payment terms",
    ],
  },
  {
    slug: "pharmacy-masters",
    name: "Pharmacy Masters",
    icon: Refrigerator,
    description:
      "Shelf, batch and store configuration for pharmacy stock control.",
    managedBy: ["SUPER_ADMIN", "ADMIN", "PHARMACIST"],
    fields: [
      "Stores, shelves and sub-stores",
      "Batch and expiry controls",
      "Reorder levels and schedule",
    ],
  },
  {
    slug: "system",
    name: "System Configuration",
    icon: Settings2,
    description:
      "Application behaviour, numbering series, backups and audit settings.",
    managedBy: ["SUPER_ADMIN", "ADMIN"],
    fields: [
      "Document numbering series",
      "Session, locale and date formats",
      "Backup, audit log and notification settings",
    ],
  },
];

export const SETTINGS_MAP = SETTINGS_CATEGORIES.reduce((acc, entry) => {
  acc[entry.slug] = entry;
  return acc;
}, {});

export default SETTINGS_CATEGORIES;
