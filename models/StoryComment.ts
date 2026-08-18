import { Schema, models, model } from "mongoose";

// A flat (non-threaded) comment on a Story/Moment — deliberately
// simpler than Thought (no atSec, no reply nesting, no likes-on-
// comments) since Moments comments are a lighter-weight reaction, not
// a timestamped discussion thread.
const StoryCommentSchema = new Schema({
  storyId: { type: String, required: true, index: true },
  userId:  { type: String, required: true },
  text:    { type: String, required: true, trim: true, maxlength: 300 },
  createdAt: { type: Date, default: Date.now },
});

StoryCommentSchema.index({ storyId: 1, createdAt: 1 });

export const StoryCommentModel = models.StoryComment ?? model("StoryComment", StoryCommentSchema);
