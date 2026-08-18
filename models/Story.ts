import { Schema, models, model } from "mongoose";

// A Story is the 24-hour post on the home rail (audio note, photo or
// a quoted line). It used to be deleted outright once `expiresAt`
// passed (a Mongo TTL index), but that made a personal archive
// impossible — there was nothing left to show. Now `expiresAt` only
// controls whether it appears on the public 24h rail (see the
// `expiresAt > now` filter in app/api/stories/route.ts); the document
// itself sticks around so GET /api/stories?archive=1 can still find it.
const StorySchema = new Schema({
  userId: { type: String, required: true, index: true },

  kind: { type: String, enum: ["audio", "photo", "quote"], required: true },

  caption:  { type: String, default: "", maxlength: 280 },
  /** Cloudinary URL for audio/photo stories. Empty for quotes. */
  mediaUrl: { type: String, default: "" },

  /** userIds who have opened it — length is the view count. */
  viewedBy: [{ type: String }],

  /** userIds who liked it — same embedded-array pattern Thought
   *  already uses (Story volume is comparably small per user). */
  likedBy: [{ type: String }],

  /** Cached from the StoryComment collection, mirroring how
   *  Episode/Series cache their own counts rather than counting on
   *  every read. */
  commentCount: { type: Number, default: 0 },

  /** Instagram-style "only me" — excluded from everyone else's rail,
   *  but the owner still sees (and can un-hide) it on their own. */
  hidden: { type: Boolean, default: false },

  /** Quick privacy preset. "followers" (default) matches this rail's
   *  historical behavior — following + self only. "private" is a
   *  synonym for `hidden` above going forward (both are checked on
   *  read, see app/api/stories/route.ts). "public" is accepted and
   *  stored for forward-compatibility with a future public Stories
   *  surface, but today behaves the same as "followers" since there
   *  is no broader public feed for Stories to appear on. */
  visibility: { type: String, enum: ["public", "followers", "private"], default: "followers" },

  /** Set by an admin acting on a Report (see models/Report.ts) —
   *  excluded from every read except the moderation log. Distinct
   *  from `hidden`, which is the owner's own choice. */
  removedByModeration: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

StorySchema.index({ userId: 1, createdAt: -1 });

export const StoryModel = models.Story ?? model("Story", StorySchema);
