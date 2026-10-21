import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { logAudit, requestIp } from "@/lib/audit";
import { parseBody } from "@/lib/validation";
import {
  duplicateResponse,
  isDuplicateKey,
  resolveAccess,
  serialize,
} from "@/lib/resource-access";
import { primaryModuleForCollection } from "@/lib/menu-utils";

function parseId(raw) {
  return ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

function auditTarget(entity, values, existing) {
  return (
    String(values?.[entity.fields[0].name] ?? existing?.[entity.fields[0].name] ?? "-")
  );
}

/** GET /api/resource/[collection]/[id] — single record. */
export async function GET(request, { params }) {
  const { collection, id } = await params;
  const access = await resolveAccess(collection);
  if (!access.ok) return access.response;

  const objectId = parseId(id);
  if (!objectId) {
    return NextResponse.json({ error: "Invalid record id." }, { status: 400 });
  }

  try {
    const col = await getCollection(collection);
    const doc = await col.findOne({ _id: objectId });
    if (!doc) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    return NextResponse.json({ row: serialize(doc) });
  } catch {
    return NextResponse.json(
      { error: "The record could not be read. Is MongoDB running?" },
      { status: 503 }
    );
  }
}

/** PUT /api/resource/[collection]/[id] — validated update + audit. */
export async function PUT(request, { params }) {
  const { collection, id } = await params;
  const access = await resolveAccess(collection, { write: true });
  if (!access.ok) return access.response;

  const { entity, session } = access;
  const objectId = parseId(id);
  if (!objectId) {
    return NextResponse.json({ error: "Invalid record id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { values, errors } = parseBody(entity, body, { mode: "update" });
  if (errors) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fields: errors },
      { status: 400 }
    );
  }

  const set = { ...values, updatedAt: new Date().toISOString() };

  if (collection === "users") {
    if (values.password) {
      set.passwordHash = bcrypt.hashSync(values.password, 10);
    }
    delete set.password;
    delete set.username; // usernames are immutable
  }

  try {
    const col = await getCollection(collection);
    const existing = await col.findOne({ _id: objectId });
    if (!existing) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    const result = await col.updateOne({ _id: objectId }, { $set: set });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    await logAudit({
      user: session.user.username,
      action: "update",
      module: primaryModuleForCollection(collection)?.slug ?? "-",
      screen: entity.label,
      record: auditTarget(entity, values, existing),
      summary: `Updated ${entity.label} record`,
      ip: requestIp(request),
    });

    const updated = await col.findOne({ _id: objectId });
    return NextResponse.json({ ok: true, row: serialize(updated) });
  } catch (error) {
    if (isDuplicateKey(error)) return duplicateResponse();
    return NextResponse.json(
      { error: "The record could not be updated. Please try again." },
      { status: 500 }
    );
  }
}

/** DELETE /api/resource/[collection]/[id] — guarded delete + audit. */
export async function DELETE(request, { params }) {
  const { collection, id } = await params;
  const access = await resolveAccess(collection, { write: true });
  if (!access.ok) return access.response;

  const { entity, session } = access;
  const objectId = parseId(id);
  if (!objectId) {
    return NextResponse.json({ error: "Invalid record id." }, { status: 400 });
  }

  try {
    const col = await getCollection(collection);
    const existing = await col.findOne({ _id: objectId });
    if (!existing) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    await col.deleteOne({ _id: objectId });

    await logAudit({
      user: session.user.username,
      action: "delete",
      module: primaryModuleForCollection(collection)?.slug ?? "-",
      screen: entity.label,
      record: auditTarget(entity, null, existing),
      summary: `Deleted ${entity.label} record`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "The record could not be deleted. Please try again." },
      { status: 500 }
    );
  }
}
