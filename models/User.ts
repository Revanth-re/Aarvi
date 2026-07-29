import { Schema, models, model } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

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

  // RBAC (see models/Role.ts, models/Permission.ts, lib/rbac.ts): ids
  // of Role documents granted to this user. Empty by default — the
  // legacy env-based admin allow-list (lib/admin.ts) still works
  // unchanged as a super-admin bypass, so nothing breaks while roles
  // get adopted incrementally.
  roles: [{ type: String }],

  // ─── Gamification (see lib/gamification.ts for all the rules) ───
  // All of these are additive with safe defaults, so every existing
  // user document keeps working without a migration: a missing field
  // reads as 0 / "" / [], which is exactly "brand new player".

  /** Spendable soft currency. Ledger of changes: models/CoinTx.ts. */
  coins: { type: Number, default: 0 },

  /** Lifetime seconds listened — drives hours + listener level. */
  listenSeconds: { type: Number, default: 0 },

  /** Consecutive days with at least one listen. */
  streak:        { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },

  // Stored as a "YYYY-MM-DD" string in IST rather than a Date, on
  // purpose: streaks are a *calendar-day* concept, and comparing day
  // strings avoids the timezone drift you get comparing timestamps on
  // a server that might run in UTC.
  lastListenDate: { type: String, default: "" },

  /** Earned badge keys — see BADGES in lib/gamification.ts. */
  badges: [{ type: String }],

  /** Counters that only exist to unlock badges. */
  shortsLiked:      { type: Number, default: 0 },
  seriesCompleted:  { type: Number, default: 0 },
  /** Set once the user has listened between 00:00–04:00 IST. */
  nightOwl: { type: Boolean, default: false },

  /** Squad._id, if this user is in a squad streak group. */
  squadId: { type: String },

  // Locked episodes this user has bought with coins, as
  // "<seriesId>:<episodeId>" keys. Stored per-user on purpose: setting
  // `isLocked = false` on the series document would unlock the episode
  // for every user at once.
  unlockedEpisodes: [{ type: String }],

  /** Premium access expiry. Null/absent/past = free tier. */
  premiumUntil: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
});

// Enterprise base fields: publicId, status, visibility, audit
// (createdBy/updatedBy/deletedBy), soft delete, schemaVersion.
applyBaseSchema(UserSchema, { visibilityDefault: "private" });

export const UserModel = models.User ?? model("User", UserSchema);
