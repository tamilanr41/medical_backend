import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { LAB_ORDER_STATUSES, canAccessLab, isIsoDate, normaliseTests, serializeLab } from "@/lib/lab";

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function parseId(raw) {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

/**
 * PATCH /api/lab-orders/[id] — progress an order (sample collection, status,
 * cancellation) or amend its billing details.
 */
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to the laboratory.");

  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return fail(400, "Invalid order id.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const set = {};
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!LAB_ORDER_STATUSES.includes(status)) return fail(400, "Choose a valid status.");
    set.status = status;
    if (status === "Processing") set.collectedAt = new Date().toISOString().slice(0, 10);
  }
  if (body.sampleType !== undefined) set.sampleType = String(body.sampleType).trim();
  if (body.barcode !== undefined) set.barcode = String(body.barcode).trim();
  if (body.collectedBy !== undefined) set.collectedBy = String(body.collectedBy).trim();
  if (body.paidAmount !== undefined) set.paidAmount = Number(body.paidAmount) || 0;
  if (body.paymentMode !== undefined) set.paymentMode = String(body.paymentMode).trim();
  if (body.netAmount !== undefined) set.netAmount = Number(body.netAmount) || 0;
  if (body.priority !== undefined) set.priority = String(body.priority).trim();
  if (body.receivedAt !== undefined) {
    const date = String(body.receivedAt).trim();
    if (!isIsoDate(date)) return fail(400, "Enter a valid date.");
    set.receivedAt = date;
  }
  if (body.tests !== undefined) {
    const tests = normaliseTests(body.tests);
    if (tests.length === 0) return fail(400, "Add at least one test.");
    set.tests = tests;
  }

  if (Object.keys(set).length === 0) return fail(400, "Nothing to update.");
  set.updatedAt = new Date().toISOString();

  try {
    const col = await getCollection("lab_checkins");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Lab order not found.");

    await col.updateOne({ _id: objectId }, { $set: set });

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "lab",
      screen: "Lab Order",
      record: existing.checkinNo || "-",
      summary: `Updated lab order ${existing.checkinNo || ""} for ${existing.patientName}`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, order: serializeLab({ ...existing, ...set }) });
  } catch {
    return fail(500, "The lab order could not be updated. Please try again.");
  }
}
