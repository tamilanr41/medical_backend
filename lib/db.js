/**
 * Database client with graceful fallback for development.
 * Set HMS_DISABLE_MONGODB=true to completely disable MongoDB.
 * Uses dynamic import to avoid loading mongodb package at module evaluation time.
 */

const DEFAULT_URI = "mongodb://127.0.0.1:27017/zhanx_hms";

export const DB_NAME = process.env.MONGODB_DB || "zhanx_hms";

export function getMongoUri() {
  return process.env.MONGODB_URI || DEFAULT_URI;
}

let mongoConnectPromise = null;

/**
 * Cached native driver connection (survives dev HMR reloads via globalThis).
 * Returns null if MongoDB is unavailable or disabled, allowing demo fallbacks.
 */
export async function getDb() {
  // Allow complete MongoDB disable via environment variable
  if (process.env.HMS_DISABLE_MONGODB === "true") {
    console.log("[HMS] MongoDB disabled via HMS_DISABLE_MONGODB=true");
    return null;
  }

  if (globalThis.__hmsMongo?.db) return globalThis.__hmsMongo.db;

  // Prevent multiple simultaneous connection attempts
  if (!mongoConnectPromise) {
    mongoConnectPromise = (async () => {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(getMongoUri(), {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      });
      try {
        await client.connect();
        const db = client.db(DB_NAME);
        // Verify connection works
        await db.command({ ping: 1 });
        globalThis.__hmsMongo = { client, db };
        return db;
      } catch (err) {
        console.warn("[HMS] MongoDB unavailable, using demo fallback:", err.message);
        await client.close().catch(() => {});
        return null;
      }
    })();
  }

  return mongoConnectPromise;
}

export async function getCollection(name) {
  const db = await getDb();
  if (!db) return null;
  return db.collection(name);
}

/** True when MongoDB is reachable; used for graceful demo fallbacks. */
export async function pingDb() {
  try {
    const db = await getDb();
    if (!db) return false;
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}