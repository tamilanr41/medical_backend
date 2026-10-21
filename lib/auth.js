import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserBySession, toPublicUser } from "./demo-users";

export const SESSION_COOKIE = "hms_session";

const SECRET =
  process.env.SESSION_SECRET || "zhanx-dev-session-secret-change-me";
const DEFAULT_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

/**
 * Builds a signed, expiring session cookie value.
 * Payload: { u: username, r: role, exp: epoch ms }
 */
export function createSessionValue(user, remember = false) {
  const ttl = remember ? REMEMBER_TTL_SECONDS : DEFAULT_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      u: user.username,
      r: user.role,
      exp: Date.now() + ttl * 1000,
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifySessionValue(value) {
  if (typeof value !== "string" || !value.includes(".")) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data?.u || !data?.exp) return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: remember ? REMEMBER_TTL_SECONDS : DEFAULT_TTL_SECONDS,
  };
}

/**
 * Reads and validates the current session from the request cookies.
 * Returns `{ user, role }` or `null`. Server-only.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const claims = verifySessionValue(raw);
  if (!claims) return null;

  const record = await findUserBySession(claims.u);
  if (!record) return null;

  const user = toPublicUser(record);
  if (!user) return null;

  return { user, role: user.role };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
