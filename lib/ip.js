import { getCollection } from "@/lib/db";
import { canAccessModule } from "@/config/permissions";

/** In Patient module id from the central menu config. */
export const IP_MODULE_ID = 102;

/**
 * IPD is intentionally gated on the module (102) rather than a collection:
 * the operational data lives on `admissions`, which is not exposed by any menu
 * item, so `canAccessCollection` cannot be used as the guard here.
 */
export function canAccessIpd(session) {
  return Boolean(session && canAccessModule(session.role, 102));
}

export function serializeAdmission(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  return typeof value === "string" && DATE_RE.test(value);
}

/** Next admission number: `IP-YYYY-NNNNN` (matches the seeded 5-digit width). */
export async function nextIpNo() {
  const col = await getCollection("admissions");
  if (!col) return `IP-${new Date().getFullYear()}-00001`;
  const prefix = `IP-${new Date().getFullYear()}-`;
  const docs = await col
    .find({ ipNo: { $regex: `^${prefix}` } })
    .sort({ ipNo: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.ipNo?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

/* ------------------------------- clinical -------------------------------- */

export { IP_CLINICAL_TYPES } from "@/config/ip-reports";

const CLINICAL_PREFIX = {
  "Initial Assessment": "IA",
  "Doctor's Order": "DO",
  "Case Sheet": "CS",
  "Doctor Visit": "DV",
  "Discharge Advice": "DA",
  "Discharge Summary": "DS",
  "Patient Feedback": "PF",
};

/**
 * Case Sheets are stored on `case_sheets` because the case-sheet-register
 * report reads that collection; every other clinical record lives on
 * `ip_clinical_records` (its menu binding).
 */
export function clinicalCollection(recordType) {
  return recordType === "Case Sheet" ? "case_sheets" : "ip_clinical_records";
}

/** Reference field differs between the two clinical collections. */
export function clinicalRefField(collection) {
  return collection === "case_sheets" ? "caseSheetNo" : "refNo";
}

async function nextSequential(collection, field, prefix) {
  const col = await getCollection(collection);
  if (!col) return `${prefix}00001`;
  const docs = await col
    .find({ [field]: { $regex: `^${prefix}` } })
    .sort({ [field]: -1 })
    .limit(1)
    .toArray();
  const match = docs[0]?.[field]?.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

/** Next clinical reference, e.g. `CS-2026-00012` or `IA-2026-00003`. */
export async function nextClinicalRefNo(recordType) {
  const collection = clinicalCollection(recordType);
  const field = clinicalRefField(collection);
  const prefix = `${CLINICAL_PREFIX[recordType] || "IPCR"}-${new Date().getFullYear()}-`;
  return nextSequential(collection, field, prefix);
}

/** Normalises a clinical doc into the shape the screens expect. */
export function serializeClinical(doc, source) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    ...rest,
    _id: String(_id),
    source,
    refNo: rest.refNo || rest.caseSheetNo || "",
  };
}

/* -------------------------------- billing -------------------------------- */

export { IP_BILLING_TYPES } from "@/config/ip-reports";

/** Next billing reference, e.g. `IAC-2026-00004`. */
export async function nextBillingRefNo(prefix) {
  return nextSequential("ip_billing_records", "refNo", `${prefix}-${new Date().getFullYear()}-`);
}

export function serializeBilling(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}
