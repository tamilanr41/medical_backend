import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { IP_BILLING_MODES, IP_BILLING_STATUSES } from "@/config/ip-reports";
import { canAccessIpd, isIsoDate, serializeBilling } from "@/lib/ip";

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function parseId(raw) {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

/** PATCH /api/ip-billing-records/[id] — move a billing entry through its workflow. */
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessIpd(session)) {
    return fail(403, "Your role does not have access to IP billing data.");
  }

  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return fail(400, "Invalid record id.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const set = {};
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!IP_BILLING_STATUSES.includes(status)) return fail(400, "Choose a valid status.");
    set.status = status;
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) return fail(400, "Enter a valid amount.");
    set.amount = amount;
  }
  if (body.mode !== undefined) {
    const mode = String(body.mode).trim();
    if (mode && !IP_BILLING_MODES.includes(mode)) return fail(400, "Choose a valid payment mode.");
    set.mode = mode;
  }
  if (body.remarks !== undefined) set.remarks = String(body.remarks).trim();
  if (body.date !== undefined) {
    const date = String(body.date).trim();
    if (!isIsoDate(date)) return fail(400, "Enter a valid date.");
    set.date = date;
  }

  if (Object.keys(set).length === 0) return fail(400, "Nothing to update.");
  set.updatedAt = new Date().toISOString();

  try {
    const col = await getCollection("ip_billing_records");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Billing record not found.");

    await col.updateOne({ _id: objectId }, { $set: set });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "ipd",
      screen: existing.documentType || "IP Billing",
      record: existing.refNo || "-",
      summary: `Updated ${existing.documentType || "billing record"} for ${existing.patientName}`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, record: serializeBilling({ ...existing, ...set }) });
  } catch {
    return fail(500, "The billing record could not be updated. Please try again.");
  }
}
