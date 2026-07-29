import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { RoleModel } from "@/models/Role";
import { PermissionModel } from "@/models/Permission";
import { RolePermissionModel } from "@/models/RolePermission";
import { writeAuditLog } from "@/lib/audit";

// GET: list all roles with their granted permission keys (for an admin
// RBAC management screen).
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const [roles, permissions, grants] = await Promise.all([
      RoleModel.find().sort({ createdAt: 1 }),
      PermissionModel.find(),
      RolePermissionModel.find(),
    ]);
    const permissionById = new Map(permissions.map((p) => [p._id.toString(), p.key]));
    const result = roles.map((role) => ({
      id: role._id.toString(),
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      status: role.status,
      permissions: grants
        .filter((g) => g.roleId === role._id.toString())
        .map((g) => permissionById.get(g.permissionId))
        .filter(Boolean),
    }));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: create a new custom role. Body: { key, name, description? }
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const { key, name, description } = (await req.json()) as {
      key?: string;
      name?: string;
      description?: string;
    };
    if (!key || !name) {
      return NextResponse.json({ error: "key and name are required" }, { status: 400 });
    }
    const actorId = req.headers.get("x-user-email");
    const role = await RoleModel.create({
      key: String(key).toLowerCase().trim(),
      name,
      description: description ?? "",
      createdBy: actorId,
      updatedBy: actorId,
    });
    await writeAuditLog({
      entityType: "Role",
      entityId: role._id.toString(),
      action: "create",
      actorId,
      after: role.toObject(),
    });
    return NextResponse.json(role, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json({ error: "A role with that key already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
