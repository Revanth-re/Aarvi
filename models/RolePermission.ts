import { Schema, models, model } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

// Join table: which Permissions a Role grants. Kept as its own
// collection (rather than an array on Role) so permission grants get
// their own audit trail (createdBy/createdAt of the grant itself) and
// so a permission can be revoked without rewriting the whole Role doc.
const RolePermissionSchema = new Schema({
  roleId:       { type: String, required: true, index: true }, // Role._id as string
  permissionId: { type: String, required: true, index: true }, // Permission._id as string
});

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

applyBaseSchema(RolePermissionSchema, { visibilityDefault: "private" });

export const RolePermissionModel =
  models.RolePermission ?? model("RolePermission", RolePermissionSchema);
