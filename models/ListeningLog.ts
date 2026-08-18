import { Schema, models, model } from "mongoose";

// One document per (user, calendar day) — upserted with $inc on every
// listening heartbeat (see recordListening in lib/gamificationServer.ts).
// User.listenSeconds already tracks the lifetime total; this is the
// day-by-day breakdown that total doesn't give you, and it's what
// powers the Wrapped/stats screen's daily bars.
const ListeningLogSchema = new Schema({
  userId: { type: String, required: true },
  /** YYYY-MM-DD, see dayKey() in lib/gamification.ts. */
  dayKey: { type: String, required: true },
  seconds: { type: Number, default: 0 },
});

ListeningLogSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

export const ListeningLogModel = models.ListeningLog ?? model("ListeningLog", ListeningLogSchema);
