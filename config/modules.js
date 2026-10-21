import {
  Activity,
  Ambulance,
  Bed,
  BedDouble,
  Bone,
  Droplet,
  Droplets,
  FileText,
  FolderOpen,
  Glasses,
  Landmark,
  Package,
  PersonStanding,
  Pill,
  Salad,
  Scan,
  Scissors,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  TestTube,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";

export const HOSPITAL = {
  name: "Zhanx Hospital",
  systemName: "ZHANX HOSPITAL MANAGEMENT SYSTEM",
  shortName: "ZHANX HMS",
  tagline: "Integrated Hospital Management System",
  campus: "Main Campus",
  version: "2.4.0",
  supportEmail: "helpdesk@zhanx.example",
  supportExtension: "Ext. 200",
};

/**
 * Category order drives how modules are grouped on the Home launcher.
 * `accent` classes are intentionally kept as literal strings so Tailwind
 * can detect them during the build.
 */
export const CATEGORIES = [
  {
    id: "clinical",
    label: "Clinical",
    icon: Stethoscope,
    accent: "bg-blue-50 text-blue-700 ring-blue-100",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    tile: "bg-gradient-to-br from-brand-500 to-brand-700",
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    icon: Activity,
    accent: "bg-purple-50 text-purple-700 ring-purple-100",
    chip: "border-purple-200 bg-purple-50 text-purple-700",
    tile: "bg-gradient-to-br from-purple-500 to-fuchsia-600",
  },
  {
    id: "records",
    label: "Medical Records",
    icon: FileText,
    accent: "bg-slate-100 text-slate-700 ring-slate-200",
    chip: "border-slate-200 bg-slate-100 text-slate-700",
    tile: "bg-gradient-to-br from-zinc-500 to-zinc-700",
  },
  {
    id: "pharmacy-services",
    label: "Pharmacy & Services",
    icon: Pill,
    accent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    tile: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  {
    id: "administration",
    label: "Administration",
    icon: Users,
    accent: "bg-amber-50 text-amber-700 ring-amber-100",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    tile: "bg-gradient-to-br from-amber-500 to-orange-600",
  },
  {
    id: "finance-operations",
    label: "Finance & Operations",
    icon: Landmark,
    accent: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    chip: "border-cyan-200 bg-cyan-50 text-cyan-700",
    tile: "bg-gradient-to-br from-cyan-500 to-cyan-600",
  },
  {
    id: "system",
    label: "System",
    icon: ShieldCheck,
    accent: "bg-rose-50 text-rose-700 ring-rose-100",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    tile: "bg-gradient-to-br from-rose-500 to-pink-600",
  },
];

/**
 * Central module configuration.
 *
 * Mirrors the legacy Zhanx Home module launcher: every entry keeps its
 * original application reference ID (`id`) and maps it to a modern Next.js
 * route. Cards on the Home screen are rendered dynamically from this list.
 */
export const MODULES = [
  {
    id: 101,
    name: "Out Patient",
    shortName: "OPD",
    slug: "opd",
    route: "/opd",
    icon: UserPlus,
    description:
      "Patient registration, appointments and outpatient consultation",
    category: "clinical",
    keywords: ["opd", "registration", "appointment", "consultation", "op"],
    enabled: true,
    features: [
      "Walk-in and appointment registration queues",
      "Consultation rooms, doctor rosters and token generation",
      "Outpatient prescriptions, referrals and follow-up visits",
    ],
  },
  {
    id: 102,
    name: "In Patient",
    shortName: "IPD",
    slug: "ipd",
    route: "/ipd",
    icon: BedDouble,
    description:
      "Admission, inpatient care, ward management and discharge",
    category: "clinical",
    keywords: ["ipd", "admission", "discharge", "inpatient", "stay"],
    enabled: true,
    features: [
      "Admission, transfer and discharge workflows",
      "Attending doctor rounds, care plans and vitals charting",
      "Discharge summaries and final bill integration",
    ],
  },
  {
    id: 103,
    name: "Laboratory",
    shortName: "LAB",
    slug: "laboratory",
    route: "/laboratory",
    icon: TestTube,
    description:
      "Laboratory orders, sample collection and investigation reports",
    category: "diagnostics",
    keywords: ["lab", "laboratory", "pathology", "sample", "report", "test"],
    enabled: true,
    features: [
      "Order entry, sample barcoding and collection stations",
      "Analyser interfaces and result validation",
      "Report printing with reference ranges and flags",
    ],
  },
  {
    id: 104,
    name: "X-Ray",
    shortName: "XRAY",
    slug: "xray",
    route: "/xray",
    icon: Bone,
    description: "Radiology X-Ray requests, scheduling and reporting",
    category: "diagnostics",
    keywords: ["xray", "x-ray", "radiology", "imaging", "film"],
    enabled: true,
    features: [
      "Modality worklists and technician capture queues",
      "Radiologist reporting with templates and prior comparison",
      "Film / digital archive retrieval and CD export",
    ],
  },
  {
    id: 105,
    name: "Scan",
    shortName: "SCAN",
    slug: "scan",
    route: "/scan",
    icon: Scan,
    description: "CT, MRI and diagnostic scan management",
    category: "diagnostics",
    keywords: ["scan", "ct", "mri", "ultrasound", "usg", "pet"],
    enabled: true,
    features: [
      "CT, MRI, ultrasound and contrast study scheduling",
      "Protocol selection, dosage sheets and radiation records",
      "Structured reporting and image archive linkage",
    ],
  },
  {
    id: 106,
    name: "Specialty Tests",
    shortName: "SPCL",
    slug: "specialty-tests",
    route: "/specialty-tests",
    icon: Activity,
    description:
      "Specialized diagnostic testing, capture sheets and reporting",
    category: "diagnostics",
    keywords: ["specialty", "ecg", "eeg", "pft", "endo", "cardiology"],
    enabled: true,
    features: [
      "ECG, EEG, PFT, endoscopy and other specialty captures",
      "Specialist interpretation workflows and sign-off",
      "Longitudinal trend sheets for chronic investigations",
    ],
  },
  {
    id: 107,
    name: "Physiotherapy",
    shortName: "PHYSIO",
    slug: "physiotherapy",
    route: "/physiotherapy",
    icon: PersonStanding,
    description: "Therapy sessions, treatment plans and progress tracking",
    category: "clinical",
    keywords: ["physio", "physiotherapy", "therapy", "rehab", "exercise"],
    enabled: true,
    features: [
      "Therapy prescriptions and session scheduling",
      "Exercise protocols, attendance and progress notes",
      "Session-wise charging and package tracking",
    ],
  },
  {
    id: 108,
    name: "Dialysis",
    shortName: "DIAL",
    slug: "dialysis",
    route: "/dialysis",
    icon: Droplets,
    description:
      "Dialysis scheduling, sessions, consumables and billing",
    category: "clinical",
    keywords: ["dialysis", "hd", "dialyser", "nephrology", "session"],
    enabled: true,
    features: [
      "Shift scheduling with machine and chair allocation",
      "Session charts, vitals and dialysis prescriptions",
      "Consumable stock deduction and session billing",
    ],
  },
  {
    id: 109,
    name: "Ward",
    shortName: "WARD",
    slug: "ward",
    route: "/ward",
    icon: Bed,
    description: "Ward allocation, bed management and nursing handover",
    category: "clinical",
    keywords: ["ward", "bed", "nursing", "allocation", "handover"],
    enabled: true,
    features: [
      "Live bed board with occupancy and housekeeping status",
      "Ward-wise admission queues and bed transfers",
      "Nursing handover sheets and ward stock registers",
    ],
  },
  {
    id: 110,
    name: "MRD",
    shortName: "MRD",
    slug: "mrd",
    route: "/mrd",
    icon: FolderOpen,
    description:
      "Medical records, document management and record tracking",
    category: "records",
    keywords: ["mrd", "records", "discharge summary", "documents", "archive"],
    enabled: true,
    features: [
      "Record issue, return and rack location tracking",
      "Scanned document upload with patient indexing",
      "Medico-legal record requests and audit trails",
    ],
  },
  {
    id: 111,
    name: "OP Theatre",
    shortName: "OPT",
    slug: "op-theatre",
    route: "/op-theatre",
    icon: Scissors,
    description:
      "Operation theatre scheduling, procedures and surgical records",
    category: "clinical",
    keywords: ["theatre", "operation", "surgery", "ot", "anaesthesia"],
    enabled: true,
    features: [
      "Theatre schedule, procedure lists and surgeon rosters",
      "Anaesthesia notes, checklists and safety sign-offs",
      "Implant registers and post-operative orders",
    ],
  },
  {
    id: 127,
    name: "CSSD",
    shortName: "CSSD",
    slug: "cssd",
    route: "/cssd",
    icon: Sparkles,
    description:
      "Central sterile supply, instrument tracking and sterilization cycles",
    category: "pharmacy-services",
    keywords: ["cssd", "sterile", "sterilization", "instruments", "autoclave"],
    enabled: true,
    features: [
      "Instrument set assembly and tray identification",
      "Autoclave cycle logs with indicator records",
      "Ward-wise sterile issue, return and recall tracking",
    ],
  },
  {
    id: 112,
    name: "Insurance",
    shortName: "INS",
    slug: "insurance",
    route: "/insurance",
    icon: ShieldCheck,
    description:
      "Insurance claims, pre-authorizations and settlement tracking",
    category: "administration",
    keywords: ["insurance", "claim", "tpa", "pre-auth", "settlement"],
    enabled: true,
    features: [
      "Pre-authorization requests and eligibility checks",
      "Claim packaging with documents and query handling",
      "Settlement, denial and resale tracking per policy",
    ],
  },
  {
    id: 113,
    name: "Pharmacy",
    shortName: "PHA",
    slug: "pharmacy",
    route: "/pharmacy",
    icon: Pill,
    description:
      "Medicine dispensing, stock, purchase and pharmacy billing",
    category: "pharmacy-services",
    keywords: ["pharmacy", "medicine", "dispensing", "stock", "billing"],
    enabled: true,
    features: [
      "OPD / IPD dispensing with prescription validation",
      "Batch, expiry and reorder level stock control",
      "Pharmacy billing, returns and controlled drug register",
    ],
  },
  {
    id: 114,
    name: "Optical",
    shortName: "OPTL",
    slug: "optical",
    route: "/optical",
    icon: Glasses,
    description:
      "Optical sales, lens orders, frames and prescriptions",
    category: "pharmacy-services",
    keywords: ["optical", "lens", "frame", "spectacles", "vision"],
    enabled: true,
    features: [
      "Eye test prescriptions and frame / lens catalog",
      "Order tracking, fitment and delivery status",
      "Counter sales, warranties and exchange processing",
    ],
  },
  {
    id: 115,
    name: "Transport",
    shortName: "TRN",
    slug: "transport",
    route: "/transport",
    icon: Ambulance,
    description:
      "Ambulance deployment, patient transport and trip logging",
    category: "administration",
    keywords: ["transport", "ambulance", "trip", "vehicle", "dispatch"],
    enabled: true,
    features: [
      "Ambulance dispatch, trip sheets and driver rosters",
      "Patient pick-up / drop scheduling with locations",
      "Vehicle mileage, maintenance and trip costing",
    ],
  },
  {
    id: 116,
    name: "House Keeping",
    shortName: "HK",
    slug: "housekeeping",
    route: "/housekeeping",
    icon: Sparkles,
    description:
      "Housekeeping tasks, ward cleaning and hygiene schedules",
    category: "administration",
    keywords: ["housekeeping", "cleaning", "hygiene", "laundry", "waste"],
    enabled: true,
    features: [
      "Area-wise cleaning schedules and task assignment",
      "Bio-waste and linen movement registers",
      "Inspection checklists with quality scoring",
    ],
  },
  {
    id: 117,
    name: "Blood Bank",
    shortName: "BB",
    slug: "blood-bank",
    route: "/blood-bank",
    icon: Droplet,
    description:
      "Blood group inventory, donations, cross-matching and issues",
    category: "pharmacy-services",
    keywords: ["blood", "donation", "crossmatch", "group", "bank"],
    enabled: true,
    features: [
      "Donor registration, screening and collection drives",
      "Component preparation and stock / expiry management",
      "Cross-matching, issue and transfusion reaction records",
    ],
  },
  {
    id: 118,
    name: "Diet",
    shortName: "DIET",
    slug: "diet",
    route: "/diet",
    icon: Salad,
    description: "Diet plans, meal trays and nutritional care",
    category: "pharmacy-services",
    keywords: ["diet", "meal", "nutrition", "tray", "kitchen"],
    enabled: true,
    features: [
      "Diet order capture by ward, room and condition",
      "Menu planning, substitutions and tray marking",
      "Kitchen production sheets and dietitian notes",
    ],
  },
  {
    id: 120,
    name: "HRM",
    shortName: "HRM",
    slug: "hrm",
    route: "/hrm",
    icon: Users,
    description:
      "Employee records, attendance, payroll and leave management",
    category: "administration",
    keywords: ["hr", "hrm", "employee", "payroll", "leave", "attendance"],
    enabled: true,
    features: [
      "Staff profiles, departments and contract management",
      "Attendance, shift rosters and leave workflows",
      "Payroll inputs, statutory records and appraisal cycles",
    ],
  },
  {
    id: 121,
    name: "Purchase",
    shortName: "PUR",
    slug: "purchase",
    route: "/purchase",
    icon: ShoppingCart,
    description:
      "Purchase orders, suppliers and procurement workflow",
    category: "finance-operations",
    keywords: ["purchase", "procurement", "supplier", "po", "quotation"],
    enabled: true,
    features: [
      "Indent, quotation comparison and purchase order creation",
      "Goods receipt with partial and short delivery handling",
      "Supplier invoices, returns and lead time analytics",
    ],
  },
  {
    id: 122,
    name: "Asset",
    shortName: "AST",
    slug: "assets",
    route: "/assets",
    icon: Package,
    description:
      "Hospital asset registry, maintenance and depreciation",
    category: "finance-operations",
    keywords: ["asset", "equipment", "maintenance", "inventory", "depreciation"],
    enabled: true,
    features: [
      "Asset register with location, warranty and vendor details",
      "Preventive maintenance schedules and service history",
      "Depreciation, transfer and disposal documentation",
    ],
  },
  {
    id: 123,
    name: "Finance",
    shortName: "FIN",
    slug: "finance",
    route: "/finance",
    icon: Landmark,
    description:
      "Hospital financial transactions, collections and reports",
    category: "finance-operations",
    keywords: ["finance", "billing", "collection", "ledger", "revenue"],
    enabled: true,
    features: [
      "Collections, receipts, refunds and day-end reconciliation",
      "Revenue reports by department, doctor and service line",
      "Receivables, write-offs and financial period control",
    ],
  },
  {
    id: 124,
    name: "Admin",
    shortName: "ADM",
    slug: "admin",
    route: "/admin",
    icon: UserCog,
    description:
      "System administration, users, roles and configuration",
    category: "system",
    keywords: ["admin", "users", "roles", "configuration", "settings"],
    enabled: true,
    features: [
      "User accounts, role assignments and access reviews",
      "Master data setup for clinical and non-clinical modules",
      "System configuration, audit logs and backup controls",
    ],
  },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, category) => {
  acc[category.id] = category;
  return acc;
}, {});

/** id -> Lucide icon component, for client bundles that only receive serialisable module data. */
export const ICON_BY_MODULE_ID = MODULES.reduce((acc, module) => {
  acc[module.id] = module.icon;
  return acc;
}, {});

export const CATEGORY_BY_MODULE_ID = MODULES.reduce((acc, module) => {
  acc[module.id] = CATEGORY_MAP[module.category];
  return acc;
}, {});

export default MODULES;
