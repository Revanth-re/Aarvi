import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { RoleModel } from "@/models/Role";
import { PermissionModel } from "@/models/Permission";
import { RolePermissionModel } from "@/models/RolePermission";

// Default RBAC catalog. Idempotent — safe to call more than once
// (upserts by `key`), so it can run as part of environment setup the
// same way /api/seed does for demo content.
const PERMISSIONS: { key: string; name: string; module: string }[] = [
  { key: "series:create", name: "Create series", module: "series" },
  { key: "series:update", name: "Update series", module: "series" },
  { key: "series:delete", name: "Delete series", module: "series" },
  { key: "products:create", name: "Create products", module: "products" },
  { key: "products:update", name: "Update products", module: "products" },
  { key: "products:delete", name: "Delete products", module: "products" },
  { key: "users:view", name: "View user accounts", module: "users" },
  { key: "users:ban", name: "Suspend or ban a user", module: "users" },
  { key: "moderation:review", name: "Review moderation queue items", module: "moderation" },
  { key: "moderation:action", name: "Act on moderation queue items", module: "moderation" },
  { key: "analytics:view", name: "View analytics dashboards", module: "analytics" },
];

const ROLES: { key: string; name: string; permissionKeys: string[] }[] = [
  {
    key: "moderator",
    name: "Moderator",
    permissionKeys: ["moderation:review", "moderation:action", "users:view"],
  },
  {
    key: "creator",
    name: "Creator",
    permissionKeys: ["series:create", "series:update"],
  },
  {
    key: "support",
    name: "Support",
    permissionKeys: ["users:view"],
  },
];

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();

    const permissionDocs = await Promise.all(
      PERMISSIONS.map((p) =>
        PermissionModel.findOneAndUpdate(
          { key: p.key },
          { $setOnInsert: { key: p.key, name: p.name, module: p.module } },
          { upsert: true, new: true }
        )
      )
    );
    const permissionIdByKey = new Map(permissionDocs.map((p) => [p.key, p._id.toString()]));

    const roleDocs = await Promise.all(
      ROLES.map((r) =>
        RoleModel.findOneAndUpdate(
          { key: r.key },
          { $setOnInsert: { key: r.key, name: r.name, isSystem: true } },
          { upsert: true, new: true }
        )
      )
    );

    let grants = 0;
    for (let i = 0; i < ROLES.length; i++) {
      const roleId = roleDocs[i]._id.toString();
      for (const permKey of ROLES[i].permissionKeys) {
        const permissionId = permissionIdByKey.get(permKey);
        if (!permissionId) continue;
        await RolePermissionModel.findOneAndUpdate(
          { roleId, permissionId },
          { $setOnInsert: { roleId, permissionId } },
          { upsert: true }
        );
        grants++;
      }
    }

    return NextResponse.json({
      ok: true,
      permissions: permissionDocs.length,
      roles: roleDocs.length,
      grants,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
