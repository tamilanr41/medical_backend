/**
 * OPD › Report catalogue (legacy `FrameWork/Consultation/OP*Report.jsp`).
 *
 * The legacy screens handed rendering to an external Jasper server (paths like
 * `App/Report/<ReportName>`); those templates are not part of this repository.
 * In the current model every OP financial figure lives on the `op_bills`
 * collection (payment / sponsor / credit data is embedded there) while clinical
 * detail lives on `op_visits` and cards on `op_privilege_cards`, so each report
 * below is mapped to the equivalent collection. Reports whose legacy source
 * could not be recovered carry a `note` describing the substitution.
 *
 * Client-safe: no server imports. Query execution lives in
 * `lib/reports/op-financial.js`.
 */

export const OP_SELECT_BY_OPTIONS = [
  { value: "period", label: "Period" },
  { value: "time", label: "Time" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export const OP_FORMAT_OPTIONS = [
  { value: "HTML", label: "HTML (on screen)" },
  { value: "PDF", label: "PDF" },
  { value: "XLS", label: "Excel" },
];

/** Optional filter controls keyed by the same names used in query execution. */
const FILTER_DOCTOR = "doctor";
const FILTER_MODE = "paymentMode";
const FILTER_PATIENT_TYPE = "patientType";
const FILTER_SPONSOR = "sponsor";

export const OP_REPORTS = [
  /* ----------------------------- collection ---------------------------- */
  {
    key: "op-daily-collection",
    legacy: "AllBillsReportOP",
    title: "OP Daily Collection",
    description: "Every OP bill in the period with its collection breakdown.",
    group: "Collection",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR, FILTER_MODE, FILTER_PATIENT_TYPE],
  },
  {
    key: "op-collection-by-mode",
    legacy: "DailyCollectionByPayMode",
    title: "Collection by Pay Mode",
    description: "Collected amount grouped by payment mode.",
    group: "Collection",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR, FILTER_PATIENT_TYPE],
  },
  {
    key: "op-collection-by-doctor",
    legacy: "DailyFeeCollectionByDoctorWise",
    title: "Collection by Doctor",
    description: "Collected amount grouped by consulting doctor.",
    group: "Collection",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_MODE, FILTER_PATIENT_TYPE],
  },
  {
    key: "op-expense-summary",
    legacy: "DailyExpence",
    title: "OP Expense Summary",
    description: "Discounts written off, grouped by department.",
    group: "Collection",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR],
    note: "The legacy screen listed expense vouchers that do not exist in this build. Mapped to the discount/write-off share of each bill so the forgone amount stays visible.",
  },

  /* ------------------------------ clinical ----------------------------- */
  {
    key: "clinical-patient-detail",
    legacy: "OutPatientDetail",
    title: "Clinical Patient Detail",
    description: "OP patients with their visit nature and diagnosis.",
    group: "Clinical",
    source: "op_visits",
    dateField: "visitDate",
    filters: [FILTER_DOCTOR],
  },
  {
    key: "clinical-by-purpose",
    legacy: "PatientByVisitPurpose",
    title: "Patient by Visit Nature",
    description: "OP visits grouped by visit nature with a gender split.",
    group: "Clinical",
    source: "op_visits",
    dateField: "visitDate",
    filters: [],
  },

  /* ------------------------------- billing ----------------------------- */
  {
    key: "op-bill-detail",
    legacy: "OPBillDetails",
    title: "OP Bill Detail",
    description: "Bills with amounts, payment mode and settlement status.",
    group: "Billing",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR, FILTER_MODE, FILTER_PATIENT_TYPE, FILTER_SPONSOR],
  },
  {
    key: "op-cancelled-bills",
    legacy: "CancelledBill",
    title: "Cancelled Bill Detail",
    description: "Bills cancelled within the selected period.",
    group: "Billing",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR],
  },

  /* --------------------------- advance/refund -------------------------- */
  {
    key: "op-due-detail",
    legacy: "OPDueDetail",
    title: "Patient Due Detail",
    description: "Bills with an outstanding balance, by ageing.",
    group: "Advances",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR, FILTER_SPONSOR],
  },
  {
    key: "op-advance-register",
    legacy: "OPAdvanceRegister",
    title: "Patient Advance Register",
    description: "Receipts where the patient paid more than the bill value.",
    group: "Advances",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_MODE, FILTER_SPONSOR],
  },
  {
    key: "op-refund-register",
    legacy: "OPRefundRegister",
    title: "Patient Refund Register",
    description: "Refunds paid back to patients.",
    group: "Advances",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_MODE, FILTER_SPONSOR],
  },

  /* ------------------------------ sponsors ----------------------------- */
  {
    key: "op-sponsor-collection",
    legacy: "SponsorWiseCollection",
    title: "Sponsor Wise Collection",
    description: "Collected and outstanding amount per sponsor / corporate.",
    group: "Sponsors",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR],
  },
  {
    key: "op-sponsor-due",
    legacy: "SponsorWiseDue",
    title: "Sponsor Wise Due",
    description: "Outstanding sponsor bills with the balance per bill.",
    group: "Sponsors",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR],
  },

  /* ------------------------------- monthly ----------------------------- */
  {
    key: "op-monthly-collection",
    legacy: "OPMonthlyCollection",
    title: "OP Monthly Collection",
    description: "OP collection summarised by month.",
    group: "Monthly",
    source: "op_bills",
    dateField: "billDate",
    filters: [],
    note: "The legacy screen combined OP and IP collection; only OP bills exist in this build, so the report is limited to OP.",
  },

  /* --------------------------- patient billing ------------------------- */
  {
    key: "patient-bill-detail",
    legacy: "PatientBillDetails",
    title: "Patient Billing Detail",
    description: "Bill-wise patient billing across the period.",
    group: "Patient Billing",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR, FILTER_MODE, FILTER_PATIENT_TYPE],
  },
  {
    key: "patient-bill-cash",
    legacy: "PatientCashBillApproval",
    title: "Patient Cash Bill Detail",
    description: "Cash-paid patient bills with their net cash value.",
    group: "Patient Billing",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR],
  },
  {
    key: "patient-bill-credit",
    legacy: "PatientBillCreditApproval",
    title: "Patient Credit Bill Detail",
    description: "Credit / sponsor patient bills with the approved credit.",
    group: "Patient Billing",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR, FILTER_SPONSOR],
  },

  /* --------------------------- privilege card -------------------------- */
  {
    key: "privilege-card-usage",
    legacy: "PatientPrivilegeCardUsageReport",
    title: "Privilege Card Usage",
    description: "Bills raised against patients holding a privilege card.",
    group: "Privilege Card",
    source: "op_bills",
    dateField: "billDate",
    filters: [FILTER_DOCTOR],
  },
  {
    key: "privilege-card-expiry",
    legacy: "PatientInsuranceCardDetail",
    title: "Privilege Card by Expiry",
    description: "Privilege cards listed by expiry date.",
    group: "Privilege Card",
    source: "op_privilege_cards",
    dateField: "validTo",
    filters: ["expiryWithin"],
    note: "The legacy screen rendered an insurance-card table that does not exist in this build. Mapped to the Patient Privilege Card master (card no, UHID, expiry).",
  },
];

export function getOpReport(key) {
  return OP_REPORTS.find((report) => report.key === key) ?? null;
}

/**
 * Menu item (`module/category/item` → item slug) to report screen mapping.
 * `default` is preselected; `reports` are the sibling reports offered in the
 * screen's sidebar (in order).
 */
export const OP_MENU_REPORTS = {
  "op-collection-expense": {
    title: "OP Collection and Expense",
    default: "op-daily-collection",
    reports: ["op-daily-collection", "op-collection-by-mode", "op-collection-by-doctor", "op-expense-summary"],
  },
  clinical: {
    title: "Clinical",
    default: "clinical-patient-detail",
    reports: ["clinical-patient-detail", "clinical-by-purpose"],
  },
  collection: {
    title: "Collection",
    default: "op-daily-collection",
    reports: ["op-daily-collection", "op-collection-by-mode", "op-collection-by-doctor"],
  },
  billing: {
    title: "Billing",
    default: "op-bill-detail",
    reports: ["op-bill-detail", "op-cancelled-bills"],
  },
  "advance-refund-due": {
    title: "Advance/Refund/Due",
    default: "op-due-detail",
    reports: ["op-due-detail", "op-advance-register", "op-refund-register"],
  },
  "sponsor-wise-collection-due": {
    title: "Sponsor Wise Collection and Due",
    default: "op-sponsor-collection",
    reports: ["op-sponsor-collection", "op-sponsor-due"],
  },
  expenses: {
    title: "Expenses",
    default: "op-expense-summary",
    reports: ["op-expense-summary"],
  },
  "op-ip-monthly-collection": {
    title: "OP IP Monthly Collection",
    default: "op-monthly-collection",
    reports: ["op-monthly-collection"],
  },
  "excel-export": {
    title: "Excel Export",
    default: "op-bill-detail",
    reports: ["op-bill-detail", "op-daily-collection"],
  },
  "patient-billing-report": {
    title: "Patient Billing Report",
    default: "patient-bill-detail",
    reports: ["patient-bill-detail", "patient-bill-cash", "patient-bill-credit"],
  },
  "privilege-card-report": {
    title: "Privilege Card Report",
    default: "privilege-card-usage",
    reports: ["privilege-card-usage", "privilege-card-expiry"],
  },
};

export function getOpMenu(key) {
  return OP_MENU_REPORTS[key] ?? null;
}
