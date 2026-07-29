import { Schema } from "mongoose";
import { randomUUID } from "crypto";

/**
 * Enterprise base fields, applied as a Mongoose plugin so every major
 * entity gets the same audit / soft-delete / lifecycle columns without
 * duplicating field definitions across models.
 *
 * Deliberately additive: it never touches `_id` (every existing
 * string-id reference like `favorites: [String]` or `seriesId` keeps
 * working untouched). `publicId` is a separate stable UUID for
 * external-facing use (public APIs, webhooks) where you don't want to
 * leak/rely on Mongo's ObjectId.
 *
 * Soft delete: documents are never physically removed by app code that
 * calls `.softDelete()`. Default find/count queries automatically
 * exclude soft-deleted docs (deletedAt is either unset or null on an
 * existing/未-deleted doc, and Mongo's `{ deletedAt: null }` filter
 * matches both "missing" and "null" — so this is 100% backward
 * compatible with documents that predate this plugin).
 * Call `.withDeleted()` on a query to bypass the filter (e.g. an admin
 * trash view).
 */
export interface BaseSchemaFields {
  publicId: string;
  status: "active" | "inactive" | "archived" | "pending";
  visibility: "public" | "private" | "unlisted";
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  deletedAt: Date | null;
  schemaVersion: number;
}

export interface BaseSchemaOptions {
  /** Default value for the `visibility` field. Defaults to "public". */
  visibilityDefault?: BaseSchemaFields["visibility"];
}

export function applyBaseSchema(schema: Schema, options: BaseSchemaOptions = {}): void {
  schema.add({
    publicId: {
      type: String,
      default: () => randomUUID(),
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived", "pending"],
      default: "active",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: options.visibilityDefault ?? "public",
      index: true,
    },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
    deletedBy: { type: String, default: null },
    deletedAt: { type: Date, default: null, index: true },
    schemaVersion: { type: Number, default: 1 },
  });

  // Ensure createdAt/updatedAt exist and are auto-managed, without
  // clobbering a model that already defines its own `createdAt` path
  // (Mongoose reuses existing paths when { timestamps: true } is set).
  if (!schema.get("timestamps")) {
    schema.set("timestamps", true);
  }

  type SoftDeleteQuery = { _includeDeleted?: boolean } & {
    getFilter: () => Record<string, unknown>;
    where: (cond: Record<string, unknown>) => unknown;
  };

  (schema.query as Record<string, unknown>).withDeleted = function withDeleted(
    this: SoftDeleteQuery
  ) {
    this._includeDeleted = true;
    return this;
  };

  schema.pre(/^find/, function (this: SoftDeleteQuery) {
    if (this._includeDeleted) return;
    const filter = this.getFilter();
    if (!("deletedAt" in filter)) {
      this.where({ deletedAt: null });
    }
  });

  schema.methods.softDelete = function (this: any, byUserId?: string) {
    this.deletedAt = new Date();
    this.deletedBy = byUserId ?? null;
    this.status = "archived";
    return this.save();
  };

  schema.methods.restore = function (this: any, byUserId?: string) {
    this.deletedAt = null;
    this.status = "active";
    if (byUserId) this.updatedBy = byUserId;
    return this.save();
  };
}
