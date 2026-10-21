/**
 * OP Registration report catalogue (legacy OPD › Report › Registration).
 *
 * Screen-level port of `OPRegistrationReport.jsp`. The legacy screen handed
 * rendering off to an external Jasper server (`App/Report/<ReportName>`); those
 * templates are not part of this repository, so each report below is mapped to
 * the equivalent data in the current HMS Mongo model. Reports whose legacy
 * source could not be recovered carry a `note` describing the substitution so
 * the mapping stays transparent.
 *
 * This module is free of server imports so the catalogue can render on the
 * client. Query execution lives in `lib/reports/op-registration.js`.
 */

export const SELECT_BY_OPTIONS = [
  { value: "period", label: "Period" },
  { value: "time", label: "Time" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export const FORMAT_OPTIONS = [
  { value: "HTML", label: "HTML (on screen)" },
  { value: "PDF", label: "PDF" },
  { value: "XLS", label: "Excel" },
];

export const CASE_TYPE_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "NEW_CASE", label: "New case" },
  { value: "OLD_CASE", label: "Old case" },
];

/**
 * Report catalogue. `filters` lists the optional controls to show in addition
 * to the Select By date selector (which every report uses). `dateField` is the
 * document field the date selector applies to.
 */
export const OP_REGISTRATION_REPORTS = [
  {
    key: "registration-by-op-number",
    legacy: "OPRegistration",
    legacyView: "OPRegistrationView",
    title: "Registration by OP Number",
    description: "Every OP registration in the selected period, keyed by OP number.",
    group: "Registration",
    dateField: "visitDate",
    filters: ["doctor", "visitNature", "caseType"],
  },
  {
    key: "registration-by-doctor",
    legacy: "OPRegistrationByDoctor",
    legacyView: "OPRegistrationByDoctorView",
    title: "Registration by Doctor",
    description: "OP registrations with new / old and gender split per doctor.",
    group: "Registration",
    dateField: "visitDate",
    filters: ["doctor", "visitNature", "caseType"],
  },
  {
    key: "referred-by-doctor",
    legacy: "DoctorsReferral",
    legacyView: "DoctorReferralDoctorWiseReportView",
    title: "Doctor Referral (Referred By)",
    description: "Registrations grouped by the doctor who referred them.",
    group: "Registration",
    dateField: "visitDate",
    filters: ["doctor", "visitNature", "caseType"],
  },
  {
    key: "cancelled-registrations",
    legacy: "OPRegisterCancelled",
    legacyView: "OPRegisterCanceledView",
    title: "Cancelled Registrations",
    description: "OP registrations cancelled within the selected period.",
    group: "Registration",
    dateField: "visitDate",
    filters: ["doctor"],
  },
  {
    key: "insurance-card-expiry",
    legacy: "PatientInsuranceCardDetail",
    legacyView: "PatientInsuranceCardDetailView",
    title: "Patient Insurance Card Detail",
    description: "Privilege / insurance cards listed by expiry date.",
    group: "Insurance",
    dateField: "validTo",
    filters: ["expiryWithin"],
    note: "The legacy screen rendered an insurance-card table that does not exist in this build. Mapped to the Patient Privilege Card master (card no, UHID, expiry).",
  },
  {
    key: "insurance-card-credit-limit",
    legacy: "PatientInsuranceCardDetailByCreditLimit",
    legacyView: "PatientInsuranceCardDetailByCreditLimitView",
    title: "Patient Card Detail by Credit Limit",
    description: "Privilege / insurance cards whose credit limit falls in a range.",
    group: "Insurance",
    dateField: "validTo",
    dateMode: "none",
    filters: ["creditLimit"],
    note: "Legacy source unavailable; mapped to the Patient Privilege Card master using its credit limit.",
  },
  {
    key: "op-register-specialty",
    legacy: "OPRegisterDaily",
    legacyView: "OPRegisterDailyView",
    title: "OP Register (Specialty Wise)",
    description: "OP registrations aggregated by specialty for the period.",
    group: "Register",
    dateField: "visitDate",
    filters: ["doctor"],
  },
  {
    key: "appointment-detail",
    legacy: "EEAppointmentDetail",
    legacyView: "EEAppointmentDetail",
    title: "Appointment Detail",
    description: "Booked OP appointments with slot, token and status.",
    group: "Appointment",
    dateField: "visitDate",
    filters: ["doctor"],
  },
];

export const REPORT_GROUPS = ["Registration", "Insurance", "Register", "Appointment"];

export function getReport(key) {
  return OP_REGISTRATION_REPORTS.find((report) => report.key === key) ?? null;
}
