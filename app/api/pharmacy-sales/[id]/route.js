import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { restoreStock, serializeSale } from "@/lib/pharmacy-sales";

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function oid(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

/** GET /api/pharmacy-sales/[id] — single sale. */
export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "pharmacy_cash_sales")) {
    return fail(403, "Your role does not have access to pharmacy sales.");
  }

  const { id } = await params;
  const _id = oid(id);
  if (!_id) return fail(400, "Invalid sale id.");

  const col = await getCollection("pharmacy_sales");
  if (!col) return fail(503, "Pharmacy sales storage is unavailable.");
  const doc = await col.findOne({ _id });
  if (!doc) return fail(404, "Sale not found.");
  return NextResponse.json({ sale: serializeSale(doc) });
}

/**
 * DELETE /api/pharmacy-sales/[id] — cancels a sale and restores stock.
 * Sales are never hard-deleted to preserve the audit trail.
 */
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canAccessCollection(session.role, "pharmacy_cash_sales")) {
    return fail(403, "Your role does not have access to pharmacy sales.");
  }

  const { id } = await params;
  const _id = oid(id);
  if (!_id) return fail(400, "Invalid sale id.");

  const col = await getCollection("pharmacy_sales");
  if (!col) return fail(503, "Pharmacy sales storage is unavailable.");
  const doc = await col.findOne({ _id });
  if (!doc) return fail(404, "Sale not found.");
  if (doc.status === "Cancelled") {
    return fail(409, "This sale is already cancelled.");
  }

  await restoreStock(doc.stockAllocations || []);
  await col.updateOne(
    { _id },
    { $set: { status: "Cancelled", cancelledAt: new Date().toISOString() } }
  );

  await logAudit({
    user: session.user.username,
    action: "delete",
    module: "pharmacy",
    screen: "Cash Sale",
    record: doc.billNo,
    summary: `Pharmacy sale ${doc.billNo} cancelled`,
    ip: requestIp(request),
  });

  return NextResponse.json({ ok: true });
}
