import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const excludeId = searchParams.get("excludeId");

    if (!code) {
      return NextResponse.json({ available: true });
    }

    const col = await getCollection("lab_doctors");
    if (!col) {
      return NextResponse.json({ available: true });
    }

    const query = { code: code.trim() };
    if (excludeId && excludeId !== "new") {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(excludeId)) {
        query._id = { $ne: new ObjectId(excludeId) };
      }
    }

    const existing = await col.findOne(query);
    if (existing) {
      return NextResponse.json({ available: false, message: "Doctor code already exists" });
    }

    return NextResponse.json({ available: true });
  } catch {
    return NextResponse.json({ available: true });
  }
}
