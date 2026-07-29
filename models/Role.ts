import { Schema, models, model } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

// A named bundle of permissions (e.g. "admin", "moderator", "creator").
// Assigned to users via User.roles (array of Role _id strings).
// Granted permissions live in RolePermission (see models/RolePermission.ts).
const RoleSchema = new Schema({
  key:         { type: String, required: true, unique: true, trim: true, lowercase: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  // System roles (seeded by the app) can't be deleted from an admin UI,
  // only edited/disabled via `status`.
  isSystem:    { type: Boolean, default: false },
});

applyBaseSchema(RoleSchema, { visibilityDefault: "private" });

export const RoleModel = models.Role ?? model("Role", RoleSchema);
