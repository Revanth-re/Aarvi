import { Schema, models, model } from "mongoose";

const NotificationSchema = new Schema({
  userId:       { type: String, required: true }, // recipient
  type:         { type: String, required: true }, // e.g. "room_invite"
  message:      { type: String, required: true },
  link:         { type: String },
  fromUserId:   { type: String },
  fromUserName: { type: String },
  read:         { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now },
});

export const NotificationModel = models.Notification ?? model("Notification", NotificationSchema);
