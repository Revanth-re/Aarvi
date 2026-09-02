import { Schema, models, model } from "mongoose";

// One play per (episode, user), permanently — not per session. Mirrors
// EpisodeLike's shape/reasoning exactly: the client can't be trusted to
// remember "have I already counted this" past a page reload, so that
// has to live here instead of in a component ref.
const EpisodePlaySchema = new Schema({
  userId:    { type: String, required: true },
  seriesId:  { type: String, required: true, index: true },
  episodeId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

EpisodePlaySchema.index({ episodeId: 1, userId: 1 }, { unique: true });

export const EpisodePlayModel = models.EpisodePlay ?? model("EpisodePlay", EpisodePlaySchema);
