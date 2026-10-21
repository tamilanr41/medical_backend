import { getCollection } from "@/lib/db";

/**
 * Fire-and-forget audit trail writer (§23). Failures never break a request.
 *
 * Entry: { user, action, module, screen, record, summary, ip }
 * action: create | update | delete | login | logout | export
 */
export async function logAudit(entry) {
  try {
    const collection = await getCollection("audit_logs");
    await collection.insertOne({
      at: new Date().toISOString(),
      user: entry.user || "system",
      action: entry.action || "update",
      module: entry.module || "-",
      screen: entry.screen || "-",
      record: entry.record || "-",
      summary: entry.summary || "",
      ip: entry.ip || "local",
      createdAt: new Date().toISOString(),
    });
  } catch {
    /* audit must never fail the calling request */
  }
}

/** Best-effort client IP for audit records. */
export function requestIp(request) {
  return (
    request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request?.headers?.get("x-real-ip") ||
    "local"
  );
}
