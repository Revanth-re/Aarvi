// import mongoose from "mongoose";
// const URI ="mongodb+srv://aarvi:aarvi%401206@aarvi-cluster.n3h9ppt.mongodb.net/aarvi?retryWrites=true&w=majority&appName=aarvi-cluster";
// interface Cache { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null; }
// declare global { var __mongoose: Cache; }
// const cache: Cache = global.__mongoose || { conn: null, promise: null };
// if (!global.__mongoose) global.__mongoose = cache;
// export async function connectDB() {
//   if (cache.conn) return cache.conn;
//   if (!cache.promise) cache.promise = mongoose.connect(URI, { bufferCommands: false });
//   cache.conn = await cache.promise;
//   return cache.conn;
// }
import mongoose from "mongoose";

// Properly encode the password
// "aarvi@1206" should be encoded as "aarvi%401206" (you have this correct)
// But make sure the entire string is properly formatted
const URI = "mongodb+srv://aarvi:aarvi%401206@aarvi-cluster.n3h9ppt.mongodb.net/aarvi?retryWrites=true&w=majority&appName=aarvi-cluster";

interface Cache { 
  conn: typeof mongoose | null; 
  promise: Promise<typeof mongoose> | null; 
}

declare global { 
  var __mongoose: Cache; 
}

const cache: Cache = global.__mongoose || { conn: null, promise: null };

if (!global.__mongoose) {
  global.__mongoose = cache;
}

export async function connectDB() {
  try {
    if (cache.conn) {
      console.log("Using existing database connection");
      return cache.conn;
    }
    
    if (!cache.promise) {
      console.log("Creating new database connection...");
      cache.promise = mongoose.connect(URI, { 
        bufferCommands: false,
        // Add these options for better reliability
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }
    
    cache.conn = await cache.promise;
    console.log("Database connected successfully");
    return cache.conn;
  } catch (error) {
    console.error("Database connection error:", error);
    // Reset cache on error
    cache.promise = null;
    cache.conn = null;
    throw error;
  }
}