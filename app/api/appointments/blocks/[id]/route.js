import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { canSchedule } from "@/lib/appointments";

function fail(status, error) {
  return NextResponse.json({ error }, { status });
}

/** DELETE /api/appointments/blocks/[id] — releases a blocked range. */
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return fail(401, "Your session has expired. Please sign in again.");
  if (!canSchedule(session)) {
    return fail(403, "Your role does not have access to appointments.");
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) return fail(400, "Invalid block id.");

  try {
    const col = await getCollection("op_appointment_blocks");
    const existing = await col.findOne({ _id: new ObjectId(id) });
    if (!existing) return fail(404, "Blocked range not found.");

    await col.deleteOne({ _id: existing._id });

    await logAudit({
      user: session.user.username,
      action: "delete",
      module: "opd",
      screen: "Appointment - By Doctor",
      record: `${existing.doctor} ${existing.date} ${existing.startTime}-${existing.endTime}`,
      summary: `Released blocked range for ${existing.doctor}`,
      ip: requestIp(request),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return fail(500, "The blocked range could not be released. Please try again.");
  }
}
