import mongoose, { Schema, model, models } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

const ProductSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price:       { type: Number, required: true, min: 0 },
    stock:       { type: Number, default: 0, min: 0 },
    category:    {
      type: String,
      default: "merchandise",
      enum: ["accessories", "clothing", "handicrafts", "merchandise"],
    },
    images:     [{ type: String }],
    tags:       [{ type: String }],
    rating:     { type: Number, default: 0, min: 0, max: 5 },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Enterprise base fields: publicId, status, visibility, audit
// (createdBy/updatedBy/deletedBy), soft delete, schemaVersion.
applyBaseSchema(ProductSchema, { visibilityDefault: "public" });

export const ProductModel = models.Product ?? model("Product", ProductSchema);
