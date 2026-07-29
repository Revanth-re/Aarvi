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

const MessageSchema = new Schema({
  conversationId: { type: String, required: true, index: true },
  senderId:       { type: String, required: true },
  text:           { type: String, required: true, trim: true, maxlength: 2000 },
  readBy:         [{ type: String }],
  createdAt:      { type: Date, default: Date.now, index: true },
});

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const ConversationModel = models.Conversation ?? model("Conversation", ConversationSchema);
export const MessageModel      = models.Message ?? model("Message", MessageSchema);
