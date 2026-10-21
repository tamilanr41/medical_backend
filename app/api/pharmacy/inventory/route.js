import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { canAccessCollection } from "@/lib/menu-utils";

/**
 * GET /api/pharmacy/inventory
 *
 * Live stock + batch levels keyed by medicine, used by the Medicine Lookup
 * screen to render on-hand quantity, reorder state and batch expiry. Read-only
 * and gated to roles that can open the medicine master. Returns
 * `{ available: false }` when MongoDB is unreachable instead of failing.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You are not signed in." }, { status: 401 });
  }

  if (!canAccessCollection(session.role, "medicines")) {
    return NextResponse.json(
      { error: "You do not have access to pharmacy inventory." },
      { status: 403 }
    );
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ available: false, stock: [], batches: [] });
  }

  try {
    const [stock, batches] = await Promise.all([
      db.collection("stock").find({}).toArray(),
      db.collection("batches").find({}).sort({ expiryDate: 1 }).toArray(),
    ]);

    const clean = (rows) =>
      rows.map(({ _id, ...rest }) => ({ id: String(_id), ...rest }));

    return NextResponse.json({
      available: true,
      stock: clean(stock),
      batches: clean(batches),
    });
  } catch {
    return NextResponse.json({ available: false, stock: [], batches: [] });
  }
}
