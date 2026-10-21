import { getCollection } from "@/lib/db";
import { canAccessModule } from "@/config/permissions";
import {
  DIAG_MODULES,
  DIAG_ORDER_STATUSES,
  DIAG_PRIORITIES,
  DIAG_MODES,
  DIAG_RESULT_STATUSES,
  getDiagModule,
} from "@/config/diag-ui";

export function canAccessDiag(session, slug) {
  const mod = getDiagModule(slug);
  if (!mod || !session) return false;
  return canAccessModule(session.role, mod.id);
}

export {
  DIAG_MODULES,
  DIAG_ORDER_STATUSES,
  DIAG_PRIORITIES,
  DIAG_MODES,
  DIAG_RESULT_STATUSES,
  getDiagModule,
} from "@/config/diag-ui";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  return typeof value === "string" && DATE_RE.test(value);
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

export function nextDiagNo(slug) {
  const mod = getDiagModule(slug);
  if (!mod) return nextSequential("diag_checkins", "checkinNo", `DIA-${new Date().getFullYear()}-`);
  return nextSequential("diag_checkins", "checkinNo", `${mod.orderPrefix}-${new Date().getFullYear()}-`);
}

export function nextDiagResultNo(slug) {
  const mod = getDiagModule(slug);
  const prefix = mod ? mod.resultPrefix : "DRES";
  return nextSequential("diag_results", "resultNo", `${prefix}-${new Date().getFullYear()}-`);
}

export function nextDiagExternalNo(slug) {
  const mod = getDiagModule(slug);
  const prefix = mod ? mod.externalPrefix : "DEXT";
  return nextSequential("diag_external_tests", "requestNo", `${prefix}-${new Date().getFullYear()}-`);
}

export function nextDiagSponsorNo(slug) {
  const mod = getDiagModule(slug);
  const prefix = mod ? mod.sponsorPrefix : "DSD";
  return nextSequential("diag_sponsor_dues", "receiptNo", `${prefix}-${new Date().getFullYear()}-`);
}

export function serializeDiag(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: String(_id) };
}

export function normaliseDiagTests(raw) {
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
