import { Schema, models, model } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

// A Squad is a small group with a *shared* streak: if any member fails
// to hit the daily listening goal, the streak resets for everyone. That
// social pressure is the whole point of the feature.
//
// `checkins` is a map of "YYYY-MM-DD" → userId[] rather than a
// per-member counter, because the streak rule needs to answer "did
// EVERY member check in on day X?" — which a counter can't answer once
// membership changes.
const SquadSchema = new Schema({
  name:    { type: String, required: true, trim: true },
  ownerId: { type: String, required: true },

  // Invite code so joining doesn't require exposing the squad's _id.
  code: { type: String, required: true, unique: true, index: true },

  memberIds: [{ type: String }],

  // Minutes each member must listen per day to keep the streak alive.
  goalMinutes: { type: Number, default: 10 },

  streak:        { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },

  // "YYYY-MM-DD" (IST) → array of userIds who checked in that day.
  checkins: { type: Map, of: [String], default: () => new Map() },

  // Last day the streak was evaluated, so evaluation is idempotent —
  // hitting the endpoint 50 times in a day can't inflate the streak.
  lastEvaluated: { type: String, default: "" },
}, { timestamps: true });

SquadSchema.index({ memberIds: 1 });

applyBaseSchema(SquadSchema, { visibilityDefault: "private" });

export const SquadModel = models.Squad ?? model("Squad", SquadSchema);
