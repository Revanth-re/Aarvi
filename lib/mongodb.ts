import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongoose ?? { conn: null, promise: null };
global.__mongoose = cached;

// Runs once per server process. See the comment below on what it's for.
let indexesSynced = false;

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined in environment variables");
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { dbName: "aarvi", bufferCommands: false });
  }
  cached.conn = await cached.promise;

  // Self-healing fix for a real bug: this database predates
  // username/mobile+password login, back when `googleId` was the only
  // way to identify a user and its index was a plain (non-sparse)
  // unique index. Every credentials signup since then has failed with
  // "E11000 duplicate key ... googleId: null", because a classic
  // unique index treats every `null` as the same value — only a
  // *sparse* index (what models/User.ts now declares) skips documents
  // missing the field entirely. Mongoose never alters an index that
  // already exists in the database just because the schema changed, so
  // without this, the stale index sticks around forever. syncIndexes()
  // reconciles the real indexes against the current schema — dropping
  // the stale one and rebuilding it correctly — so nobody has to run a
  // manual migration by hand. Guarded to run at most once per process,
  // and failures here are logged, not thrown, so a lack of index
  // permissions never breaks the app.
  if (!indexesSynced) {
    indexesSynced = true;
    try {
      const { UserModel } = await import("@/models/User");
      await UserModel.syncIndexes();
    } catch (e) {
      console.error("User index sync failed (non-fatal):", e);
    }
  }

  return cached.conn;
}
