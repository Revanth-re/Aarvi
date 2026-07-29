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

  /** Mirrors User.settings.privacy.publicThoughts at post time. */
  isPublic: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
});

// The two hot reads: the global feed (newest first) and every thought
// on one episode ordered by position in the audio.
ThoughtSchema.index({ createdAt: -1 });
ThoughtSchema.index({ episodeId: 1, atSec: 1 });

export const ThoughtModel = models.Thought ?? model("Thought", ThoughtSchema);
