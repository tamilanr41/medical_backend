import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { LAB_MODES, canAccessLab, serializeLab } from "@/lib/lab";

const SPONSOR_STATUSES = ["Outstanding", "Partially Paid", "Settled"];

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

const parseId = (raw) => (ObjectId.isValid(raw) ? new ObjectId(raw) : null);
const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** PATCH /api/lab-sponsor-dues/[id] — apply a collection against a sponsor bill. */
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to the laboratory.");

  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return fail(400, "Invalid sponsor due id.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const set = {};
  if (body.collectedAmount !== undefined) {
    const collected = num(body.collectedAmount);
    if (collected < 0) return fail(400, "Enter a valid collection.");
    set.collectedAmount = collected;
  }
  if (body.mode !== undefined) {
    const mode = String(body.mode).trim();
    if (mode && !LAB_MODES.includes(mode)) return fail(400, "Choose a valid mode.");
    set.mode = mode;
  }
  if (body.remarks !== undefined) set.remarks = String(body.remarks).trim();
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!SPONSOR_STATUSES.includes(status)) return fail(400, "Choose a valid status.");
    set.status = status;
  }

  if (Object.keys(set).length === 0) return fail(400, "Nothing to update.");
  set.updatedAt = new Date().toISOString();

  try {
    const col = await getCollection("lab_sponsor_dues");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Sponsor due not found.");

    if (set.collectedAmount !== undefined && set.status === undefined) {
      const due = num(existing.dueAmount);
      const collected = set.collectedAmount;
      set.status = collected <= 0 ? "Outstanding" : collected >= due ? "Settled" : "Partially Paid";
    }

    await col.updateOne({ _id: objectId }, { $set: set });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "lab",
      screen: "Sponsor Due Collection",
      record: existing.receiptNo || "-",
      summary: `Updated sponsor due ${existing.receiptNo || ""} for ${existing.sponsor}`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, due: serializeLab({ ...existing, ...set }) });
  } catch {
    return fail(500, "The sponsor due could not be updated. Please try again.");
  }
}
