import { Schema, models, model } from "mongoose";

// A Thought is a note pinned to a *moment* inside an episode — the
// thing that makes "jump to moment" work. `atSec` is the whole point:
// without it a thought is just a comment.
//
// Author name/handle/image are deliberately NOT denormalised here. The
// feed joins the User collection instead, so a rename or new avatar
// updates every thought the person ever left rather than leaving stale
// copies scattered across the collection.
const ThoughtSchema = new Schema({
  userId:    { type: String, required: true, index: true },
  seriesId:  { type: String, required: true, index: true },
  episodeId: { type: String, required: true },

  /** Seconds into the episode. */
  atSec: { type: Number, required: true, min: 0 },

  text: { type: String, required: true, trim: true, maxlength: 500 },

  likedBy: [{ type: String }],

  /** Set when this is a reply to another thought. */
  parentId: { type: String, default: null, index: true },

  /** Mirrors User.settings.privacy.publicThoughts at post time. Kept
   *  for backward compatibility — `visibility` below is the source of
   *  truth going forward; isPublic is just (visibility === "public"). */
  isPublic: { type: Boolean, default: true },

  /** Quick privacy preset — see the comment on Episode.visibility in
   *  models/Series.ts for the general design. "followers" is the
   *  historical default (isPublic:true showed to anyone, which in
   *  practice was always read through a follow-scoped feed anyway). */
  visibility: { type: String, enum: ["public", "followers", "private"], default: "followers" },

  /** Set by an admin acting on an abuse Report (see models/Report.ts)
   *  — excluded from every read except the moderation log. Distinct
   *  from a user deleting their own thought (that's a hard delete). */
  hiddenByModeration: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

// The two hot reads: the global feed (newest first) and every thought
// on one episode ordered by position in the audio.
ThoughtSchema.index({ createdAt: -1 });
ThoughtSchema.index({ episodeId: 1, atSec: 1 });

export const ThoughtModel = models.Thought ?? model("Thought", ThoughtSchema);
