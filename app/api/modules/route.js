import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getModulesForRole } from "@/config/permissions";

/**
 * Module launcher payload for the signed-in user.
 * This is the integration point for a future backend: permissions are
 * resolved server-side and only serialisable data leaves the server.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const modules = getModulesForRole(session.role).map((module) => ({
    id: module.id,
    name: module.name,
    shortName: module.shortName,
    route: module.route,
    description: module.description,
    category: module.category,
    enabled: module.enabled,
    allowed: module.allowed,
  }));

  return NextResponse.json({
    modules,
    role: session.role,
    visibility: "disabled",
  });
}
