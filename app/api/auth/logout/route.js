import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSession, sessionCookieOptions } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";

export async function POST(request) {
  const session = await getSession();
  if (session) {
    await logAudit({
      user: session.user.username,
      action: "logout",
      module: "-",
      screen: "Header",
      record: session.user.username,
      summary: "Signed out",
      ip: requestIp(request),
    });
  }

  const response = NextResponse.json({ ok: true, redirect: "/login" });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(false),
    maxAge: 0,
  });
  return response;
}
