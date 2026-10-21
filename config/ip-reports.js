/**
 * In Patient › Report catalogue (legacy `FrameWork/Consultation/IP*Report.jsp`).
 *
 * The legacy screens delegated rendering to a Jasper server
 * (`App/Report/<ReportName>`); those templates are not part of this repository.
 * In this build the IP operational data lives on `admissions` (with ward / bed /
 * admission & discharge dates) joined to `room_cleanings` and `case_sheets`.
 * The legacy financial collections (`ip_advance_details`, `ip_payment_details`,
 * `ip_daily_collections`) are retained as report sources so the screens render
 * (empty until data is captured) without altering the data model.
 *
 * Client-safe: no server imports. Query execution lives in
 * `lib/reports/ip-financial.js`.
 */

export const IP_SELECT_BY_OPTIONS = [
  { value: "period", label: "Period" },
  { value: "time", label: "Time" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export const IP_FORMAT_OPTIONS = [
  { value: "HTML", label: "HTML (on screen)" },
  { value: "PDF", label: "PDF" },
  { value: "XLS", label: "Excel" },
];

export const IP_ADMISSION_TYPES = ["Emergency", "Elective", "Day Care"];
export const IP_ADMISSION_STATUSES = ["Admitted", "Discharged", "Transferred"];
export const IP_WARDS = ["General Ward", "ICU", "HDU", "Maternity", "Pediatric", "Private"];

/** IPD clinical menu slug → the `recordType` stored on the record. */
export const IP_CLINICAL_TYPES = {
  "initial-assessment": "Initial Assessment",
  "doctors-order": "Doctor's Order",
  "case-sheet": "Case Sheet",
  "schedule-doctor-visit": "Doctor Visit",
  "discharge-advice": "Discharge Advice",
  "discharge-summary": "Discharge Summary",
  "patient-feedback": "Patient Feedback",
};

export const IP_CLINICAL_STATUSES = ["Open", "Closed"];

/**
 * IPD billing menu slug → the ledger reference written to `ip_billing_records`.
 * `documentType` distinguishes the 9 billing transactions; `status` is the
 * default workflow state; `prefix` seeds the sequential reference number.
 */
export const IP_BILLING_TYPES = {
  "ip-advance-request": { documentType: "Advance Request", status: "Pending", prefix: "IAR" },
  "ip-advance-collection": { documentType: "Advance Collection", status: "Posted", prefix: "IAC" },
  "discount-authorization": { documentType: "Discount Authorization", status: "Pending", prefix: "IDA" },
  "ip-doctor-share-distribution": { documentType: "Doctor Share", status: "Approved", prefix: "IDS" },
  "inpatient-write-off": { documentType: "Write Off", status: "Pending", prefix: "IWO" },
  "ip-posting-to-finance": { documentType: "Posting to Finance", status: "Posted", prefix: "IPF" },
  "doctor-settlement-ip": { documentType: "Doctor Settlement", status: "Pending", prefix: "DSI" },
  "doctor-settlement-approval-ip": { documentType: "Doctor Settlement Approval", status: "Approved", prefix: "DSA" },
  "cancel-receipt": { documentType: "Receipt Cancel", status: "Cancelled", prefix: "ICR" },
};

export const IP_BILLING_MODES = ["Cash", "Card", "UPI", "Wallet", "Insurance", "Credit", "Sponsor"];
export const IP_BILLING_STATUSES = ["Pending", "Approved", "Posted", "Cancelled"];

/** Optional filter controls keyed by the same names used in query execution. */
const FILTER_DOCTOR = "doctor";
const FILTER_WARD = "ward";
const FILTER_ADMISSION_TYPE = "admissionType";
const FILTER_STATUS = "status";

export const IP_REPORTS = [
  /* ----------------------------- admissions ---------------------------- */
  {
    key: "ip-admission-register",
    legacy: "IPRegistration",
    title: "IP Admission Register",
    description: "Every admission in the period with ward, bed and status.",
    group: "Admissions",
    source: "admissions",
    dateField: "admissionDate",
    filters: [FILTER_DOCTOR, FILTER_WARD, FILTER_ADMISSION_TYPE, FILTER_STATUS],
  },
  {
    key: "ip-ward-occupancy",
    legacy: "RoomWiseCollection",
    title: "Ward Wise Occupancy",
    description: "Admissions per ward with the currently admitted and discharged split.",
    group: "Admissions",
    source: "admissions",
    dateField: "admissionDate",
    filters: [FILTER_DOCTOR, FILTER_ADMISSION_TYPE],
    note: "The legacy screen priced room occupancy; this build has no room tariff master, so the report shows the patient count and stay split per ward.",
  },
  {
    key: "ip-admission-type-summary",
    legacy: "IPDischarge",
    title: "Admission Type Summary",
    description: "Admissions grouped by admission type.",
    group: "Admissions",
    source: "admissions",
    dateField: "admissionDate",
    filters: [FILTER_DOCTOR, FILTER_WARD],
  },
  {
    key: "ip-doctor-admissions",
    legacy: "AdmittedDoctorUnitWiseAdmission",
    title: "Doctor Wise Admissions",
    description: "Admissions grouped by attending doctor.",
    group: "Admissions",
    source: "admissions",
    dateField: "admissionDate",
    filters: [FILTER_WARD, FILTER_ADMISSION_TYPE],
  },
  {
    key: "ip-case-sheet-register",
    legacy: "IPCaseSheet",
    title: "Case Sheet Register",
    description: "Case sheets recorded in the period.",
    group: "Clinical",
    source: "case_sheets",
    dateField: "date",
    filters: [FILTER_DOCTOR],
  },

  /* --------------------------- turn around time ------------------------ */
  {
    key: "ip-admission-turnaround",
    legacy: "IPArrivalToAdmissionTurnAround",
    title: "Admission to Discharge Turn Around",
    description: "Discharged admissions with their length of stay.",
    group: "Turn Around",
    source: "admissions",
    dateField: "admissionDate",
    filters: [FILTER_DOCTOR, FILTER_WARD],
    note: "The legacy screen timed arrival → admission; arrival timestamps are not captured in this build, so the report measures admission → discharge.",
  },
  {
    key: "ip-discharge-to-vacate",
    legacy: "IPDischargeToVacateTurnAround",
    title: "Discharge to Vacate Turn Around",
    description: "Discharge date to the linked room-cleaning request.",
    group: "Turn Around",
    source: "admissions",
    dateField: "dischargeDate",
    filters: [FILTER_WARD],
    note: "Room-cleaning requests are matched on ward / room / bed; admissions without a matching request show an empty duration.",
  },
  {
    key: "ip-stay-duration",
    legacy: "IPAdmissionToAssessmentTurnAround",
    title: "Length of Stay Distribution",
    description: "Discharged admissions bucketed by length of stay.",
    group: "Turn Around",
    source: "admissions",
    dateField: "admissionDate",
    filters: [],
    note: "Buckets the measured admission → discharge duration because assessment timestamps are not captured in this build.",
  },

  /* ------------------------- advance / payment ------------------------- */
  {
    key: "ip-advance-detail",
    legacy: "IPAdvanceDetailReport",
    title: "IP Advance Detail",
    description: "Admission advances collected with their balance.",
    group: "Advance",
    source: "ip_billing_records",
    dateField: "date",
    filters: [FILTER_DOCTOR],
  },
  {
    key: "ip-payment-detail",
    legacy: "IPPaymentDetailsReport",
    title: "IP Payment Detail",
    description: "Receipts collected against IP admissions.",
    group: "Payment",
    source: "ip_billing_records",
    dateField: "date",
    filters: [FILTER_DOCTOR],
  },

  /* ----------------------------- collection ---------------------------- */
  {
    key: "ip-daily-collection",
    legacy: "IPFeeCollectionReport",
    title: "IP Daily Collection",
    description: "Daily IP cash / card collection with refund and closing balances.",
    group: "Collection",
    source: "ip_billing_records",
    dateField: "date",
    filters: [],
  },
];

export function getIpReport(key) {
  return IP_REPORTS.find((report) => report.key === key) ?? null;
}

/**
 * Menu item (`module/category/item` → item slug) to report screen mapping.
 * `default` is preselected; `reports` are the sibling reports offered in the
 * screen's sidebar (in order).
 */
export const IP_MENU_REPORTS = {
  "ip-advance-detail": {
    title: "IP Advance Detail",
    default: "ip-advance-detail",
    reports: ["ip-advance-detail"],
  },
  "ip-payment-detail": {
    title: "IP Payment Detail",
    default: "ip-payment-detail",
    reports: ["ip-payment-detail"],
  },
  "ip-daily-collection-report": {
    title: "IP Daily Collection Report",
    default: "ip-daily-collection",
    reports: ["ip-daily-collection"],
  },
  "ip-mis-reports": {
    title: "IP MIS Reports",
    default: "ip-admission-register",
    reports: [
      "ip-admission-register",
      "ip-ward-occupancy",
      "ip-admission-type-summary",
      "ip-doctor-admissions",
      "ip-case-sheet-register",
    ],
  },
  "excel-export": {
    title: "IP Excel Export",
    default: "ip-admission-register",
    reports: ["ip-admission-register", "ip-ward-occupancy", "ip-case-sheet-register"],
  },
  "ip-turn-around-time": {
    title: "IP Turn Around Time",
    default: "ip-admission-turnaround",
    reports: ["ip-admission-turnaround", "ip-discharge-to-vacate", "ip-stay-duration"],
  },
};

export function getIpMenu(key) {
  return IP_MENU_REPORTS[key] ?? null;
}
