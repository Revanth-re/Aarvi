import { Schema, models, model } from "mongoose";

// Append-only audit trail. Deliberately NOT run through
// applyBaseSchema — audit rows are never soft-deleted, edited, or
// versioned; they're the record of what happened to everything else.
const AuditLogSchema = new Schema({
  entityType: { type: String, required: true, index: true }, // e.g. "Series", "Product", "User", "Role"
  entityId:   { type: String, required: true, index: true },
  action:     { type: String, enum: ["create", "update", "delete", "restore"], required: true },
  actorId:    { type: String, default: null }, // who performed the action, if known
  before:     { type: Schema.Types.Mixed, default: null },
  after:      { type: Schema.Types.Mixed, default: null },
  createdAt:  { type: Date, default: Date.now, index: true },
});

export const AuditLogModel = models.AuditLog ?? model("AuditLog", AuditLogSchema);
