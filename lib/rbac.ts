import { PermissionModel } from "@/models/Permission";
import { RolePermissionModel } from "@/models/RolePermission";
import { isAdminEmail } from "@/lib/admin";

export interface RbacUser {
  email?: string | null;
  roles?: string[]; // Role._id strings, e.g. from a UserModel doc's `roles` field
}

/**
 * Real, database-backed RBAC check.
 *
 * Falls back to the existing env-based admin allow-list (lib/admin.ts)
 * as a super-admin bypass, so every route that currently gates on
 * `isAdminEmail` keeps working unchanged while individual routes
 * migrate to granular permissions over time. Assumes `connectDB()` has
 * already been called by the route (same convention as the rest of
 * the model layer).
 */
export async function userHasPermission(
  user: RbacUser | null | undefined,
  permissionKey: string
): Promise<boolean> {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;

  const roleIds = user.roles ?? [];
  if (roleIds.length === 0) return false;

  const permission = await PermissionModel.findOne({ key: permissionKey });
  if (!permission) return false;

  const grant = await RolePermissionModel.findOne({
    roleId: { $in: roleIds },
    permissionId: permission._id.toString(),
  });
  return !!grant;
}
