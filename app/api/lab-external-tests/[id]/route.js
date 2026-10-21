import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { canAccessLab, isIsoDate, serializeLab } from "@/lib/lab";

const EXTERNAL_STATUSES = ["Sent", "Received", "Reported"];
const AMOUNT_STATUSES = ["Pending Approval", "Approved", "Billed"];

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

const parseId = (raw) => (ObjectId.isValid(raw) ? new ObjectId(raw) : null);
const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * PATCH /api/lab-external-tests/[id] — progress a referral or revise the
 * amounts agreed with the external organization.
 */
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessLab(session)) return fail(403, "Your role does not have access to the laboratory.");

  const { id } = await params;
  const objectId = parseId(id);
  if (!objectId) return fail(400, "Invalid referral id.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const set = {};
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!EXTERNAL_STATUSES.includes(status)) return fail(400, "Choose a valid status.");
    set.status = status;
  }
  if (body.expectedDate !== undefined) {
    const date = String(body.expectedDate).trim();
    if (date && !isIsoDate(date)) return fail(400, "Enter a valid date.");
    set.expectedDate = date;
  }
  if (body.remarks !== undefined) set.remarks = String(body.remarks).trim();

  const amountSet = {};
  if (body.quotedAmount !== undefined) amountSet.quotedAmount = num(body.quotedAmount);
  if (body.approvedAmount !== undefined) amountSet.approvedAmount = num(body.approvedAmount);
  if (body.billedAmount !== undefined) amountSet.billedAmount = num(body.billedAmount);
  if (body.amountStatus !== undefined) {
    const status = String(body.amountStatus).trim();
    if (status && !AMOUNT_STATUSES.includes(status)) return fail(400, "Choose a valid amount status.");
    amountSet.status = status || "Pending Approval";
  }

  if (Object.keys(set).length === 0 && Object.keys(amountSet).length === 0) return fail(400, "Nothing to update.");
  set.updatedAt = new Date().toISOString();

  try {
    const col = await getCollection("lab_external_tests");
    if (!col) return fail(503, "The database is unavailable. Please try again later.");

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return fail(404, "Referral not found.");

    await col.updateOne({ _id: objectId }, { $set: set });

    if (Object.keys(amountSet).length > 0) {
      const amounts = await getCollection("lab_external_amounts");
      if (amounts) {
        amountSet.updatedAt = set.updatedAt;
        await amounts.updateOne(
          { requestNo: existing.requestNo },
          {
            $set: amountSet,
            $setOnInsert: { requestNo: existing.requestNo, uhid: existing.uhid, externalLab: existing.externalLab, testName: existing.testName, createdAt: set.updatedAt },
          },
          { upsert: true }
        );
      }
    }

    await logAudit({
      user: session.user.username,
      action: "update",
      module: "lab",
      screen: "Lab Test Sent To External Org",
      record: existing.requestNo || "-",
      summary: `Updated referral ${existing.requestNo || ""} (${existing.testName})`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true, referral: serializeLab({ ...existing, ...set }) });
  } catch {
    return fail(500, "The referral could not be updated. Please try again.");
  }
}
