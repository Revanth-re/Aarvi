import { AuditLogModel } from "@/models/AuditLog";

interface WriteAuditLogParams {
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete" | "restore";
  actorId?: string | null;
  before?: unknown;
  after?: unknown;
}

/**
 * Records one row in the audit trail. Never throws — a logging failure
 * must not break the request that triggered it. Call this after a
 * mutation succeeds, e.g.:
 *
 *   const updated = await SeriesModel.findByIdAndUpdate(id, patch, { new: true });
 *   await writeAuditLog({ entityType: "Series", entityId: id, action: "update", actorId: adminEmail, before, after: updated });
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    await AuditLogModel.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log entry", err);
  }
}
