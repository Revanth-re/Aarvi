import { Schema, models, model } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

// A "Short" is a vertical-feed audio reel. It deliberately stores no
// audio of its own — it points at an episode you already have plus a
// start/end offset, so:
//   • no new uploads are needed to populate the feed,
//   • "from <Series>" always links to something real,
//   • re-encoding an episode never orphans its clips.
const ShortSchema = new Schema({
  seriesId:  { type: String, required: true },
  episodeId: { type: String, required: true },
  startSec:  { type: Number, default: 0 },
  endSec:    { type: Number, required: true },

  caption:   { type: String, default: "" },
  /** Second line under the caption, e.g. "60 seconds that break the
   *  whole case open." Sells the clip without spoiling it. */
  hook:      { type: String, default: "" },

  // Creator attribution. creatorId is optional so seeded/house clips
  // can exist before real creator accounts do — creatorHandle is what
  // actually gets rendered.
  creatorId:     { type: String },
  creatorHandle: { type: String, default: "@swara" },

  // Background gradient rendered behind the waveform. Stored rather
  // than derived so a clip looks identical on every device/session.
  gradient: { type: String, default: "linear-gradient(160deg,#f0629a,#e0703c)" },

  // Who liked it. Stored as an array (not just a counter) so the feed
  // can render the correct filled/unfilled heart per user, and so a
  // double-tap can't inflate the count.
  likedBy:      [{ type: String }],
  /** Bookmarked into Library → Saved. */
  savedBy:      [{ type: String }],
  commentCount: { type: Number, default: 0 },
  playCount:    { type: Number, default: 0 },
}, { timestamps: true });

// Feed ordering: newest first, and "which shorts belong to this series"
// is a common lookup from the series detail page.
ShortSchema.index({ createdAt: -1 });
ShortSchema.index({ seriesId: 1 });

applyBaseSchema(ShortSchema, { visibilityDefault: "public" });

export const ShortModel = models.Short ?? model("Short", ShortSchema);
