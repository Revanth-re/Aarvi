import { Schema, models, model } from "mongoose";

const PlaylistItemSchema = new Schema(
  {
    seriesId:  { type: String, required: true },
    episodeId: { type: String },
    addedAt:   { type: Date, default: Date.now },
  },
  { _id: false }
);

const PlaylistSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  items:     [PlaylistItemSchema],
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema({
  googleId:  { type: String, unique: true, sparse: true },
  email:     { type: String, required: true, unique: true },
  name:      { type: String },
  image:     { type: String },
  favorites: [{ type: String }],  // series ids

  playlists: [PlaylistSchema],

  // Accepted follows: people THIS user follows. A user's "followers"
  // are never stored directly — they're computed on read as
  // "everyone whose `following` array contains this user's id".
  // That keeps the two always in sync with zero migration risk.
  following: [{ type: String }],

  // Instagram-style follow requests: following someone doesn't take
  // effect until they accept. `followRequestsReceived` holds the IDs
  // of people who've asked to follow this user; `followRequestsSent`
  // mirrors that on the requester's own doc so the client can render
  // a "Requested" button state without an extra fetch.
  followRequestsReceived: [{ type: String }],
  followRequestsSent:     [{ type: String }],

  createdAt: { type: Date, default: Date.now },
});

export const UserModel = models.User ?? model("User", UserSchema);
