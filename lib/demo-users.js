import bcrypt from "bcryptjs";
import { SEED_USERS } from "@/config/seed-users";
import { ROLE_LABELS } from "@/config/permissions";
import { getCollection } from "@/lib/db";

/**
 * User directory.
 *
 * Primary store: MongoDB `users` collection (bcrypt-hashed passwords,
 * seeded by `npm run seed`). When the database is unreachable — or was
 * never seeded — the module falls back to the in-memory demo identities
 * so local development keeps working.
 */

const STATUS_ACTIVE = "Active";

function initials(name) {
  return name
    .replace(/^Dr\.\s?/i, "")
    .replace(/^Sister\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function toPublicUser(user) {
  if (!user) return null;
  return {
    username: user.username,
    name: user.name,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] ?? user.role,
    designation: user.designation,
    department: user.department,
    initials: initials(user.name),
  };
}

/* --------------------------- legacy fallback --------------------------- */

function legacyStore() {
  if (!globalThis.__hmsUserStore) {
    globalThis.__hmsUserStore = new Map(
      SEED_USERS.map((user) => [user.username, { ...user }])
    );
  }
  return globalThis.__hmsUserStore;
}

/* ------------------------------ resolution ----------------------------- */

/**
 * Resolves a username to a user record.
 * Returns `{ user, source: "db" | "legacy" }` or `null` when unknown.
 */
async function resolveUser(username) {
  const key = String(username || "").trim().toLowerCase();

  try {
    const users = await getCollection("users");
    const doc = await users.findOne({ username: key });
    if (doc) return { user: doc, source: "db" };

    // Unseeded database (no users at all) → keep the demo fallback alive.
    const anyUser = await users.findOne({});
    if (anyUser) return null;

    const legacy = legacyStore().get(key);
    return legacy ? { user: legacy, source: "legacy" } : null;
  } catch {
    const legacy = legacyStore().get(key);
    return legacy ? { user: legacy, source: "legacy" } : null;
  }
}

function verifyAgainst(user, source, password) {
  if (source === "db") {
    if (user.passwordHash) {
      return bcrypt.compareSync(password, user.passwordHash);
    }
    if (user.password) return user.password === password;
    return false;
  }
  return user.password === password;
}

/* -------------------------------- API ---------------------------------- */

export async function verifyCredentials(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return null;

  const found = await resolveUser(username);
  if (!found) return null;

  const { user, source } = found;
  if (user.status && user.status !== STATUS_ACTIVE) return null;
  if (!verifyAgainst(user, source, password)) return null;

  return user;
}

export async function findUserBySession(username) {
  if (typeof username !== "string") return null;
  const found = await resolveUser(username);
  if (!found) return null;
  if (found.user.status && found.user.status !== STATUS_ACTIVE) return null;
  return found.user;
}

export async function updatePassword(username, nextPassword) {
  const found = await resolveUser(username);
  if (!found) return false;
  const key = String(username).trim().toLowerCase();

  if (found.source === "db") {
    try {
      const users = await getCollection("users");
      const result = await users.updateOne(
        { username: key },
        { $set: { passwordHash: bcrypt.hashSync(nextPassword, 10) } }
      );
      return result.modifiedCount > 0;
    } catch {
      return false;
    }
  }

  legacyStore().get(key).password = nextPassword;
  return true;
}

/** Non-sensitive account list used by the login screen for demo access. */
export function listDemoAccounts() {
  return SEED_USERS.slice(0, 6).map((user) => ({
    username: user.username,
    name: user.name,
    role: ROLE_LABELS[user.role] ?? user.role,
  }));
}
