import { Schema, models, model } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

// A single grantable action, namespaced by module, e.g. "series:create",
// "products:delete", "users:ban". Roles are granted permissions through
// RolePermission (see models/RolePermission.ts); check access via
// lib/rbac.ts#userHasPermission.
const PermissionSchema = new Schema({
  key:         { type: String, required: true, unique: true, trim: true, lowercase: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  module:      { type: String, required: true, index: true }, // e.g. "series", "products", "users", "moderation"
});

applyBaseSchema(PermissionSchema, { visibilityDefault: "private" });

export const PermissionModel = models.Permission ?? model("Permission", PermissionSchema);
