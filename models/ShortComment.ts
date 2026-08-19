import { Schema, models, model } from "mongoose";

// Flat (non-threaded) comments on a Short — same reasoning as
// StoryComment: a lighter-weight reaction thread than Thoughts, no
// timestamp-in-audio concept to hang off. Editable, unlike
// StoryComment, per the Shorts requirements specifically asking for
// edit + delete.
const ShortCommentSchema = new Schema({
  shortId: { type: String, required: true, index: true },
  userId:  { type: String, required: true },
  text:    { type: String, required: true, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
  editedAt:  { type: Date },
});

ShortCommentSchema.index({ shortId: 1, createdAt: 1 });

export const ShortCommentModel = models.ShortComment ?? model("ShortComment", ShortCommentSchema);
