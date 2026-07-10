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
  following: [{ type: String }],  // user ids this user follows
  createdAt: { type: Date, default: Date.now },
});

export const UserModel = models.User ?? model("User", UserSchema);
