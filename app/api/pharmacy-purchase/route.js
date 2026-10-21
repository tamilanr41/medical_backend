import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex } from "@/lib/validation";
import {
  cleanPurchaseLine,
  computePurchaseTotals,
  nextPurchaseNo,
  purchaseKind,
  receiveStock,
  returnStock,
  serializePurchase,
} from "@/lib/pharmacy-purchase";

function fail(status, error, extra = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function resolveKind(request) {
  const kind = new URL(request.url).searchParams.get("kind") || "purchase-order";
  return { slug: kind, meta: purchaseKind(kind) };
}

/** GET /api/pharmacy-purchase?kind=&q=&date= — list documents of one purchase kind. */
export async function GET(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  const { meta } = resolveKind(request);
  if (!canAccessCollection(session.role, meta.collection)) {
    return fail(403, `Your role does not have access to ${meta.title}.`);
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const date = (searchParams.get("date") || "").trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

  try {
    const col = await getCollection(meta.collection);
    if (!col) return NextResponse.json({ rows: [], total: 0 });
    const filter = q
      ? {
          $or: ["docNo", "supplierName", "reference"].map((field) => ({
            [field]: new RegExp(escapeRegex(q), "i"),
          })),
        }
      : { docDate: date || today() };

    const rows = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    const total = await col.countDocuments(filter);
    return NextResponse.json({ rows: rows.map(serializePurchase), total });
  } catch {
    return fail(503, `${meta.title} could not be read. Is MongoDB running?`);
  }
}

/** POST /api/pharmacy-purchase?kind= — creates a purchase document, moving stock when applicable. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  const { slug, meta } = resolveKind(request);
  if (!canAccessCollection(session.role, meta.collection)) {
    return fail(403, `Your role does not have access to ${meta.title}.`);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Invalid request payload.");
  }

  const docDate = String(body.docDate ?? "").trim() || today();
  const supplierName = String(body.supplierName ?? "").trim();
  const lines = Array.isArray(body.lines) ? body.lines.map(cleanPurchaseLine) : [];
  const payableCount = lines.filter((line) => line.itemName && line.qty > 0).length;
  const totals = computePurchaseTotals(lines);

  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(docDate)) errors.docDate = "Enter a valid date.";
  if (!supplierName) errors.supplierName = "Select or enter the supplier.";
  if (payableCount === 0) errors.lines = "Add at least one item with quantity.";

  if (Object.keys(errors).length > 0) {
    return fail(400, "Please correct the highlighted fields.", { fields: errors });
  }

  try {
    const docNo = String(body.docNo ?? "").trim() || (await nextPurchaseNo(meta.collection, meta.prefix));

    let stockAllocations = [];
    if (meta.stock === "in") {
      const { allocations } = await receiveStock(lines);
      stockAllocations = allocations;
    } else if (meta.stock === "out") {
      const { allocations } = await returnStock(lines);
      stockAllocations = allocations;
    }

    const now = new Date().toISOString();
    const document = {
      kind: slug,
      docNo,
      docDate,
      supplierCode: String(body.supplierCode ?? "").trim(),
      supplierName,
      reference: String(body.reference ?? "").trim(),
      expectedDate: String(body.expectedDate ?? "").trim(),
      paymentMode: String(body.paymentMode ?? "Credit").trim() || "Credit",
      remarks: String(body.remarks ?? "").trim(),
      lines,
      ...totals,
      status: String(body.status ?? (meta.stock === "none" ? "Open" : "Received")).trim(),
      stockAllocations,
      createdBy: session?.user?.username || "",
      createdAt: now,
      updatedAt: now,
    };

    const col = await getCollection(meta.collection);
    if (!col) return fail(503, `${meta.title} storage is unavailable.`);
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: "pharmacy",
      screen: meta.title,
      record: docNo,
      summary: `${meta.title} ${docNo} for ${supplierName} - ${document.netAmount}`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, doc: serializePurchase({ ...document, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return fail(409, "This document number was just used. Please try again.");
    }
    return fail(500, `The ${meta.title} could not be saved. Please try again.`);
  }
}
