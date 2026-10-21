import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  findUserBySession,
  updatePassword,
  verifyCredentials,
} from "@/lib/demo-users";
import { logAudit, requestIp } from "@/lib/audit";

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Your session has expired. Please sign in again." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "All password fields are required." },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation do not match." },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters long." },
      { status: 400 }
    );
  }

  const record = await findUserBySession(session.user.username);
  if (!record) {
    return NextResponse.json(
      { error: "Your session has expired. Please sign in again." },
      { status: 401 }
    );
  }

  const validCurrent = await verifyCredentials(record.username, currentPassword);
  if (!validCurrent) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  const updated = await updatePassword(record.username, newPassword);
  if (!updated) {
    return NextResponse.json(
      { error: "Unable to update password. Please try again." },
      { status: 500 }
    );
  }

  await logAudit({
    user: record.username,
    action: "update",
    module: "admin",
    screen: "Change Password",
    record: record.username,
    summary: "Password changed",
    ip: requestIp(request),
  });

  return NextResponse.json({ ok: true });
}
