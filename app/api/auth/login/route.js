import { NextResponse } from "next/server";
import { verifyCredentials, toPublicUser } from "@/lib/demo-users";
import { logAudit, requestIp } from "@/lib/audit";
import {
  SESSION_COOKIE,
  createSessionValue,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = Boolean(body?.remember);

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or password. Please try again." },
      { status: 401 }
    );
  }

  await logAudit({
    user: user.username,
    action: "login",
    module: "-",
    screen: "Login",
    record: user.username,
    summary: "Successful sign-in",
    ip: requestIp(request),
  });

  const response = NextResponse.json({
    ok: true,
    user: toPublicUser(user),
    redirect: "/home",
  });

  response.cookies.set(
    SESSION_COOKIE,
    createSessionValue(user, remember),
    sessionCookieOptions(remember)
  );

  return response;
}
