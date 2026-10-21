/**
 * Laboratory › Report catalogue (legacy `FrameWork/Lab/*Report.jsp`).
 *
 * The legacy screens delegated rendering to a Jasper server; those templates
 * are not part of this repository. In this build lab orders live on
 * `lab_checkins` (one document per request, with embedded test lines) and the
 * per-test results on `lab_results` (one document per result line). External
 * referrals are held on `lab_external_tests`.
 *
 * Client-safe: no server imports. Query execution lives in
 * `lib/reports/lab.js`.
 */

import { LAB_ORDER_STATUSES, LAB_PRIORITIES, LAB_RESULT_STATUSES, LAB_SAMPLE_TYPES } from "./lab-ui";

export { LAB_ORDER_STATUSES, LAB_PRIORITIES, LAB_RESULT_STATUSES, LAB_SAMPLE_TYPES };

export const LAB_SELECT_BY_OPTIONS = [
  { value: "period", label: "Period" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export const LAB_FORMAT_OPTIONS = [
  { value: "HTML", label: "HTML (on screen)" },
  { value: "PDF", label: "PDF" },
  { value: "XLS", label: "Excel" },
];

/** Optional filter controls keyed by the same names used in query execution. */
const FILTER_TEST = "test";
const FILTER_DOCTOR = "doctor";
const FILTER_STATUS = "status";
const FILTER_PRIORITY = "priority";

export const LAB_REPORTS = [
  {
    key: "lab-order-register",
    legacy: "LabRequest",
    title: "Lab Order Register",
    description: "Every lab request in the period with patient, tests and billed amount.",
    group: "Registers",
    source: "lab_checkins",
    dateField: "receivedAt",
    filters: ["doctor", "status"],
  },
  {
    key: "lab-test-profile",
    legacy: "LabTestProfileReport",
    title: "Lab Test Profile",
    description: "Test-wise order volume and collection for the period.",
    group: "Statistics",
    source: "lab_checkins",
    dateField: "receivedAt",
    filters: ["test"],
  },
  {
    key: "lab-result-register",
    legacy: "LabResultRegister",
    title: "Lab Result Register",
    description: "Every result line captured in the period with its status.",
    group: "Results",
    source: "lab_results",
    dateField: "resultDate",
    filters: ["test", "status"],
  },
  {
    key: "lab-externalorg-share",
    legacy: "LabTestSentToExternalOrg",
    title: "Lab External Org Share",
    description: "Tests referred to an external laboratory with the shared amount.",
    group: "External",
    source: "lab_external_tests",
    dateField: "sentDate",
    filters: [],
  },
  {
    key: "lab-daily-collection",
    legacy: "LabFeeCollectionReport",
    title: "Lab Daily Collection",
    description: "Daily lab collection grouped by payment mode.",
    group: "Collection",
    source: "lab_checkins",
    dateField: "receivedAt",
    filters: [],
  },
];

export function getLabReport(key) {
  return LAB_REPORTS.find((report) => report.key === key) ?? null;
}

/**
 * Menu item (`module/category/item` → item slug) to report screen mapping.
 * `default` is preselected; `reports` are the sibling reports offered in the
 * screen's sidebar (in order).
 */
export const LAB_MENU_REPORTS = {
  "lab-test-profile": {
    title: "Lab Test Profile",
    default: "lab-test-profile",
    reports: ["lab-test-profile"],
  },
  "lab-externalorg-share": {
    title: "Lab ExternalOrg Share",
    default: "lab-externalorg-share",
    reports: ["lab-externalorg-share"],
  },
  "excel-export": {
    title: "Lab Excel Export",
    default: "lab-order-register",
    reports: ["lab-order-register", "lab-test-profile", "lab-result-register", "lab-daily-collection"],
  },
};

export function getLabMenu(key) {
  return LAB_MENU_REPORTS[key] ?? null;
}
