import { Schema, models, model } from "mongoose";

// Direct messages. One document per pair of people.
//
// `key` is the two userIds sorted and joined — a unique index on it is
// what stops two conversations being created for the same pair when
// both people happen to open a thread at the same moment.
const ConversationSchema = new Schema({
  key:          { type: String, required: true, unique: true, index: true },
  participants: [{ type: String, required: true }],
  lastMessageAt: { type: Date, default: Date.now, index: true },
  createdAt:    { type: Date, default: Date.now },
});

export function conversationKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

// Set when a message is a reply to someone's story (the Instagram
// "swipe up to reply" pattern) — a small reference card renders above
// the message text rather than the reply becoming a public comment.
const StoryRefSchema = new Schema({
  storyId:  { type: String, required: true },
  kind:     { type: String, enum: ["audio", "photo", "quote"], required: true },
  mediaUrl: { type: String, default: "" },
  caption:  { type: String, default: "" },
}, { _id: false });

// An image, video, or GIF attached to a DM. GIFs are just image/gif
// files picked from the same file input as photos — they need no
// special handling since an <img> tag animates them natively; only
// real video files (mp4/webm/etc.) get "video" and a <video> tag.
const AttachmentSchema = new Schema({
  url:  { type: String, required: true },
  kind: { type: String, enum: ["image", "video"], required: true },
}, { _id: false });

// A denormalized snapshot of the message being replied to (Instagram/
// WhatsApp-style quote reply) — stored at send time rather than joined
// live, so a quoted reply still shows correctly even if the original
// later gets deleted.
const ReplyToSchema = new Schema({
  messageId:      { type: String, required: true },
  senderId:       { type: String, required: true },
  text:           { type: String, default: "" },
  attachmentKind: { type: String, enum: ["image", "video"] },
}, { _id: false });

const MessageSchema = new Schema({
  conversationId: { type: String, required: true, index: true },
  senderId:       { type: String, required: true },
  // Not required anymore: an attachment-only message (no caption) is
  // valid, so this defaults to "" rather than requiring text.
  text:           { type: String, default: "", trim: true, maxlength: 2000 },
  readBy:         [{ type: String }],
  storyRef:       { type: StoryRefSchema, default: undefined },
  attachment:     { type: AttachmentSchema, default: undefined },
  replyTo:        { type: ReplyToSchema, default: undefined },
  // Unsend, Instagram-style: the message vanishes from both sides
  // rather than leaving a "this message was deleted" placeholder.
  // Kept as a flag (not a hard delete) so a stray reference from
  // someone else's replyTo snapshot doesn't break.
  deleted:        { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now, index: true },
});

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const ConversationModel = models.Conversation ?? model("Conversation", ConversationSchema);
export const MessageModel      = models.Message ?? model("Message", MessageSchema);
