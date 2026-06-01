import mongoose from "mongoose";
const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/naad";
interface Cache { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null; }
declare global { var __mongoose: Cache; }
const cache: Cache = global.__mongoose || { conn: null, promise: null };
if (!global.__mongoose) global.__mongoose = cache;
export async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) cache.promise = mongoose.connect(URI, { bufferCommands: false });
  cache.conn = await cache.promise;
  return cache.conn;
}
