import { Schema, models, model } from "mongoose";

// One like per (episode, user). Kept as its own collection rather than
// a `likedBy` array on the episode subdocument — mirrors how Review
// backs Series.rating: the raw list of who-liked never has to travel
// in every series payload, only the cached `likeCount` on the episode
// does (see EpSchema.likeCount in models/Series.ts).
const EpisodeLikeSchema = new Schema({
  userId:    { type: String, required: true },
  seriesId:  { type: String, required: true, index: true },
  episodeId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

EpisodeLikeSchema.index({ episodeId: 1, userId: 1 }, { unique: true });

export const EpisodeLikeModel = models.EpisodeLike ?? model("EpisodeLike", EpisodeLikeSchema);
