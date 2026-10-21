import { getCollection } from "@/lib/db";
import { canAccessModule } from "@/config/permissions";
import { LAB_MODULE_ID } from "@/config/lab-ui";

/** Laboratory module id from the central menu config. */
export function canAccessLab(session) {
  return Boolean(session && canAccessModule(session.role, LAB_MODULE_ID));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  return typeof value === "string" && DATE_RE.test(value);
}

export {
  LAB_MODES,
  LAB_ORDER_STATUSES,
  LAB_PRIORITIES,
  LAB_RESULT_STATUSES,
  LAB_SAMPLE_TYPES,
} from "@/config/lab-ui";

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

/** Lab order (check-in) number, e.g. `LAB-2026-00042`. */
export async function nextLabNo() {
  return nextSequential("lab_checkins", "checkinNo", `LAB-${new Date().getFullYear()}-`);
}

/** Result reference, e.g. `RES-2026-00031`. */
export async function nextLabResultNo() {
  return nextSequential("lab_results", "resultNo", `RES-${new Date().getFullYear()}-`);
}

/** External referral request number, e.g. `LEXT-2026-00007`. */
export async function nextExternalNo() {
  return nextSequential("lab_external_tests", "requestNo", `LEXT-${new Date().getFullYear()}-`);
}

/** Sponsor-due receipt number, e.g. `LSD-2026-00003`. */
export async function nextSponsorDueNo() {
  return nextSequential("lab_sponsor_dues", "receiptNo", `LSD-${new Date().getFullYear()}-`);
}

export function serializeLab(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

/** Normalises a test line captured on a lab order. */
export function normaliseTests(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === "string") return { name: entry.trim(), rate: 0, status: "Ordered" };
      return {
        name: String(entry?.name ?? "").trim(),
        rate: Number(entry?.rate) || 0,
        status: entry?.status === "Completed" ? "Completed" : "Ordered",
      };
    })
    .filter((line) => line.name);
}
