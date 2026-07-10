import { Schema, models, model } from "mongoose";

// One document per (user, series) pair — tracks the last episode and
// playback position a user reached in a given series, so we can show
// "your friend is on Episode 3" markers to people who follow them.
const ProgressSchema = new Schema({
  userId:    { type: String, required: true },
  seriesId:  { type: String, required: true },
  episodeId: { type: String },
  position:  { type: Number, default: 0 }, // seconds into the episode
  updatedAt: { type: Date, default: Date.now },
});

ProgressSchema.index({ userId: 1, seriesId: 1 }, { unique: true });

export const ProgressModel = models.Progress ?? model("Progress", ProgressSchema);
