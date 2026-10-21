import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCollection } from "@/lib/db";
import { logAudit, requestIp } from "@/lib/audit";
import { escapeRegex, parseBody, searchFields } from "@/lib/validation";
import {
  duplicateResponse,
  isDuplicateKey,
  resolveAccess,
  serialize,
} from "@/lib/resource-access";
import { primaryModuleForCollection } from "@/lib/menu-utils";

const MAX_PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 5000;

function buildFilter(entity, searchParams) {
  const filter = {};
  const q = (searchParams.get("q") || "").trim();

  if (q && entity) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = searchFields(entity).map((field) => ({ [field]: pattern }));
  }

  const dateField = entity?.dateField;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (dateField && (from || to)) {
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = `${to}T23:59:59.999Z`;
    filter[dateField] = range;
  }

  return filter;
}

function buildSort(entity, searchParams) {
  const requested = searchParams.get("sort");
  const direction = searchParams.get("dir") === "asc" ? 1 : -1;

  const allowed = new Set([
    ...(entity?.fields ?? []).map((field) => field.name),
    "createdAt",
    "_id",
  ]);

  if (requested && allowed.has(requested)) {
    return { [requested]: direction };
  }
  if (entity?.dateField) return { [entity.dateField]: -1 };
  return { _id: -1 };
}

/** GET /api/resource/[collection] — paginated, searchable list. */
export async function GET(request, { params }) {
  const { collection } = await params;
  const access = await resolveAccess(collection);
  if (!access.ok) return access.response;

  const { entity, session } = access;
  const { searchParams } = new URL(request.url);
  const exportAll = searchParams.get("all") === "1";

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const size = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("size")) || 20)
  );
  const limit = exportAll ? MAX_EXPORT_ROWS : size;

  try {
    const col = await getCollection(collection);
    const filter = buildFilter(entity, searchParams);
    const sort = buildSort(entity, searchParams);

    const total = await col.countDocuments(filter);
    const rows = await col
      .find(filter)
      .sort(sort)
      .skip(exportAll ? 0 : (page - 1) * size)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      rows: rows.map(serialize),
      total,
      page: exportAll ? 1 : page,
      size: limit,
      export: exportAll,
      readOnly: entity.readOnly === true,
      label: entity.label,
      requestedBy: session.user.username,
    }    );
  } catch {
    return NextResponse.json(
      { error: "The collection could not be read. Is MongoDB running?" },
      { status: 503 }
    );
  }
}

/** POST /api/resource/[collection] — validated create + audit. */
export async function POST(request, { params }) {
  const { collection } = await params;
  const access = await resolveAccess(collection, { write: true });
  if (!access.ok) return access.response;

  const { entity, session } = access;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { values, errors } = parseBody(entity, body, { mode: "create" });
  if (errors) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fields: errors },
      { status: 400 }
    );
  }

  if (collection === "users" && !values.password) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fields: { password: "Password is required." } },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const document = { ...values, createdAt: now, updatedAt: now };

  if (collection === "users") {
    document.passwordHash = bcrypt.hashSync(values.password, 10);
    delete document.password;
    document.status = document.status || "Active";
  }

  try {
    const col = await getCollection(collection);
    const result = await col.insertOne(document);

    await logAudit({
      user: session.user.username,
      action: "create",
      module: primaryModuleForCollection(collection)?.slug ?? "-",
      screen: entity.label,
      record: String(values[entity.fields[0].name] ?? result.insertedId),
      summary: `Created ${entity.label} record`,
      ip: requestIp(request),
    });

    return NextResponse.json(
      { ok: true, _id: String(result.insertedId) },
      { status: 201 }
    );
  } catch (error) {
    if (isDuplicateKey(error)) return duplicateResponse();
    return NextResponse.json(
      { error: "The record could not be saved. Please try again." },
      { status: 500 }
    );
  }
}
