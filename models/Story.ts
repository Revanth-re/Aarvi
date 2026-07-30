import { Schema, models, model } from "mongoose";

// A Story is the 24-hour post on the home rail (audio note, photo or
// a quoted line). Expiry is enforced two ways on purpose:
//   • a TTL index, so Mongo eventually deletes the document itself, and
//   • an explicit `expiresAt > now` filter on every read.
// The TTL reaper only runs about once a minute, so without the read
// filter a story could linger visibly past its expiry.
const StorySchema = new Schema({
  userId: { type: String, required: true, index: true },

  kind: { type: String, enum: ["audio", "photo", "quote"], required: true },

  caption:  { type: String, default: "", maxlength: 280 },
  /** Cloudinary URL for audio/photo stories. Empty for quotes. */
  mediaUrl: { type: String, default: "" },

  /** userIds who have opened it — length is the view count. */
  viewedBy: [{ type: String }],

  /** Instagram-style "only me" — excluded from everyone else's rail,
   *  but the owner still sees (and can un-hide) it on their own. */
  hidden: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

// TTL: Mongo drops the document once expiresAt passes.
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
StorySchema.index({ userId: 1, createdAt: -1 });

export const StoryModel = models.Story ?? model("Story", StorySchema);
