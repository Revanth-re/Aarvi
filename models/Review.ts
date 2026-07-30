import { Schema, models, model } from "mongoose";

// One rating+review per (series, user) — posting again edits the
// existing one rather than stacking duplicates, same as how most
// app-store-style review systems work.
const ReviewSchema = new Schema({
  seriesId: { type: String, required: true, index: true },
  userId:   { type: String, required: true },
  stars:    { type: Number, required: true, min: 1, max: 5 },
  text:     { type: String, default: "", trim: true, maxlength: 800 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ReviewSchema.index({ seriesId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ seriesId: 1, createdAt: -1 });

export const ReviewModel = models.Review ?? model("Review", ReviewSchema);
