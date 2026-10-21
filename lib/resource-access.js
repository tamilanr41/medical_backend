import { NextResponse } from "next/server";
import { ENTITIES, WRITABLE_COLLECTIONS } from "@/config/entities";
import { ADMIN_ONLY_COLLECTIONS } from "@/config/menu";
import { getSession } from "@/lib/auth";
import { canAccessCollection } from "@/lib/menu-utils";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

function fail(status, error) {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

/**
 * Shared guard for /api/resource: session → role access → writability →
 * admin-only collections. Returns the entity plus the session on success.
 */
export async function resolveAccess(collection, { write = false } = {}) {
  const entity = ENTITIES[collection];
  if (!entity) return fail(404, "Unknown collection.");

  const session = await getSession();
  if (!session) {
    return fail(401, "Your session has expired. Please sign in again.");
  }

  if (!canAccessCollection(session.role, collection)) {
    return fail(403, "Your role does not have access to this screen.");
  }

  if (write && !WRITABLE_COLLECTIONS.has(collection)) {
    return fail(403, "This screen is read-only.");
  }

  if (write && ADMIN_ONLY_COLLECTIONS.has(collection) && !ADMIN_ROLES.has(session.role)) {
    return fail(403, "Only administrators can modify this data.");
  }

  return { ok: true, session, entity };
}

/** Removes credential material from documents leaving the API. */
export function serialize(doc) {
  if (!doc) return null;
  const { passwordHash, password, ...rest } = doc;
  void passwordHash;
  void password;
  return { ...rest, _id: String(rest._id) };
}

export function duplicateResponse() {
  return NextResponse.json(
    { error: "A record with the same reference already exists." },
    { status: 409 }
  );
}

export function isDuplicateKey(error) {
  return error?.code === 11000;
}
