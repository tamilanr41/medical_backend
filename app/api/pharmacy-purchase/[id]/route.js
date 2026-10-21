import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import {
  purchaseKind,
  reverseReceive,
  reverseReturn,
  serializePurchase,
} from "@/lib/pharmacy-purchase";

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

function oid(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function resolveKind(request) {
  const kind = new URL(request.url).searchParams.get("kind") || "purchase-order";
  return { slug: kind, meta: purchaseKind(kind) };
}

/** GET /api/pharmacy-purchase/[id]?kind= — single document. */
export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  const { meta } = resolveKind(request);
  if (!canAccessCollection(session.role, meta.collection)) {
    return fail(403, `Your role does not have access to ${meta.title}.`);
  }

  const { id } = await params;
  const _id = oid(id);
  if (!_id) return fail(400, "Invalid document id.");

  const col = await getCollection(meta.collection);
  if (!col) return fail(503, `${meta.title} storage is unavailable.`);
  const doc = await col.findOne({ _id });
  if (!doc) return fail(404, "Document not found.");
  return NextResponse.json({ doc: serializePurchase(doc) });
}

/**
 * DELETE /api/pharmacy-purchase/[id]?kind= — cancels and reverses any stock
 * movement. Documents are retained (audit trail), never hard-deleted.
 */
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  const { meta } = resolveKind(request);
  if (!canAccessCollection(session.role, meta.collection)) {
    return fail(403, `Your role does not have access to ${meta.title}.`);
  }

  const { id } = await params;
  const _id = oid(id);
  if (!_id) return fail(400, "Invalid document id.");

  const col = await getCollection(meta.collection);
  if (!col) return fail(503, `${meta.title} storage is unavailable.`);
  const doc = await col.findOne({ _id });
  if (!doc) return fail(404, "Document not found.");
  if (doc.status === "Cancelled") return fail(409, "This document is already cancelled.");

  if (meta.stock === "in") {
    await reverseReceive(doc.stockAllocations || []);
  } else if (meta.stock === "out") {
    await reverseReturn(doc.stockAllocations || []);
  }

  await col.updateOne(
    { _id },
    { $set: { status: "Cancelled", cancelledAt: new Date().toISOString() } }
  );

  await logAudit({
    user: session.user.username,
    action: "delete",
    module: "pharmacy",
    screen: meta.title,
    record: doc.docNo,
    summary: `${meta.title} ${doc.docNo} cancelled`,
    ip: requestIp(request),
  });

  return NextResponse.json({ ok: true });
}
