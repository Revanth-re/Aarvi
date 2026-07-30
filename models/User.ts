import { Schema, models, model } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

// Mirrors UserSettings in types/index.ts. Kept as a sub-document with
// per-field defaults (rather than a loose object) so an existing user
// who has never opened Settings still reads back a complete, valid
// settings object instead of undefined.
const SettingsSchema = new Schema({
  themeColor:  { type: String, enum: ["lavender","rosegold","mint","cyberblue","peach","midnight"], default: "lavender" },
  themeMode:   { type: String, enum: ["light","dark","system"], default: "light" },
  tabBarStyle: { type: String, enum: ["transparent","normal"], default: "transparent" },

  notif: {
    episodeDrops:   { type: Boolean, default: true },
    creatorStories: { type: Boolean, default: true },
    coinRewards:    { type: Boolean, default: true },
    thoughtReplies: { type: Boolean, default: true },
    weeklyRecap:    { type: Boolean, default: false },
  },
  playback: {
    autoplayNext: { type: Boolean, default: true },
    skipIntro:    { type: Boolean, default: true },
    fadeOnSleep:  { type: Boolean, default: true },
    dataSaver:    { type: Boolean, default: false },
  },
  // Minutes. 0 = off, -1 = "end of episode".
  sleepTimerDefault: { type: Number, default: 0 },
  downloads: {
    wifiOnly:         { type: Boolean, default: true },
    autoDownloadNext: { type: Boolean, default: false },
  },
  privacy: {
    privateListening: { type: Boolean, default: false },
    allowMessages:    { type: Boolean, default: true },
    publicThoughts:   { type: Boolean, default: true },
    // Instagram-style: a public account auto-accepts follows; a
    // private one queues them as a request the owner approves/declines.
    isPrivate:        { type: Boolean, default: false },
  },
}, { _id: false });

const PlaylistItemSchema = new Schema({
  seriesId:  { type: String, required: true },
  episodeId: { type: String },
  addedAt:   { type: Date, default: Date.now },
}, { _id: false });

const PlaylistSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  items:     [PlaylistItemSchema],
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema({
  googleId: { type: String, unique: true, sparse: true },
  // Optional now: a credentials (username/mobile + password) account
  // never collects one. sparse so multiple accounts with no email
  // don't collide on the unique index.
  email:    { type: String, unique: true, sparse: true },
  name:     { type: String },
  image:    { type: String },

  // ─── Username/mobile + password login (alongside Google) ───
  /** E.164-ish digits, no formatting. Sparse-unique like handle/email. */
  mobile:   { type: String, unique: true, sparse: true, trim: true },
  /** bcrypt hash. Never selected by default — see lib/password.ts. */
  password: { type: String, select: false },

  // @handle shown across the app. Sparse-unique so the many existing
  // users without one don't all collide on null.
  handle: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  bio:    { type: String, default: "", maxlength: 160 },

  /** Unlocks Creator Studio. */
  isCreator: { type: Boolean, default: false },

  /** Preferred catalog languages, used by Discover's language filter. */
  languages: [{ type: String }],

  favorites: [{ type: String }],
  playlists: [PlaylistSchema],

  // Accepted follows. A user's followers are never stored directly —
  // they're computed as "everyone whose `following` contains this id",
  // which keeps the two sides permanently in sync.
  following:              [{ type: String }],
  followRequestsReceived: [{ type: String }],
  followRequestsSent:     [{ type: String }],

  roles: [{ type: String }],

  settings: { type: SettingsSchema, default: () => ({}) },

  // ─── Gamification (rules live in lib/gamification.ts) ───
  coins:         { type: Number, default: 0 },
  listenSeconds: { type: Number, default: 0 },
  streak:        { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },

  // "YYYY-MM-DD" in IST, not a Date: streaks are a calendar-day concept
  // and comparing day strings avoids timezone drift on a UTC server.
  lastListenDate: { type: String, default: "" },
  /** Day the +10 daily reward was last claimed. */
  lastDailyClaim: { type: String, default: "" },
  /** Rewarded ads watched, and the day that count belongs to. */
  adsWatchedDate:  { type: String, default: "" },
  adsWatchedCount: { type: Number, default: 0 },

  badges:          [{ type: String }],
  shortsLiked:     { type: Number, default: 0 },
  seriesCompleted: { type: Number, default: 0 },
  nightOwl:        { type: Boolean, default: false },

  /** "<seriesId>:<episodeId>" keys bought with coins. Per-user on
   *  purpose: flipping isLocked on the series would unlock it for all. */
  unlockedEpisodes: [{ type: String }],

  /** Who invited this user, so the referral bonus pays exactly once. */
  invitedBy:     { type: String, default: "" },
  inviteRewarded:{ type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

applyBaseSchema(UserSchema, { visibilityDefault: "private" });

export const UserModel = models.User ?? model("User", UserSchema);
