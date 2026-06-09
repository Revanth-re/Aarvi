import mongoose from "mongoose";

// ✅ Your MongoDB Atlas URI (from PinkWave .env)
const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

// Serverless-safe connection cache (prevents "too many connections" on Vercel)
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

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: "aarvi",        // ← targets your "aarvi" database on Atlas
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
