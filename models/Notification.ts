import { Schema, models, model } from "mongoose";

// Notifications carry a `category` so the screen's All / Drops /
// Social / Coins tabs are a database filter rather than a fragile
// client-side guess based on the message text.
const NotificationSchema = new Schema({
  userId: { type: String, required: true, index: true },

  category: {
    type: String,
    enum: ["drops", "social", "coins", "system"],
    default: "system",
    index: true,
  },
  /** Fine-grained kind within the category, e.g. "episode_drop". */
  type: { type: String, required: true },

  title:   { type: String, required: true },
  message: { type: String, default: "" },
  link:    { type: String },

  fromUserId:   { type: String },
  fromUserName: { type: String },

  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = models.Notification ?? model("Notification", NotificationSchema);
