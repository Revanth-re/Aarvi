import mongoose, { Schema } from "mongoose";
import { applyBaseSchema } from "@/lib/db/baseSchemaPlugin";

const TranscriptSegmentSchema = new Schema({
  text:  { type: String, required: true },
  start: { type: Number, required: true }, // seconds
  end:   { type: Number, required: true }, // seconds
}, { _id: false });

const EpSchema = new Schema({
  title:{type:String,required:true}, description:{type:String,default:""},
  duration:{type:Number,default:0}, audioUrl:{type:String,default:""},
  episodeNumber:{type:Number,required:true}, isLocked:{type:Boolean,default:false},
  transcript:{type:String,default:""}, playCount:{type:Number,default:0},
  // Times this locked episode has been unlocked by watching an ad
  // rather than spending coins — not used for anything yet (no ad
  // network is wired in, no creator payout system exists), just
  // banked for whenever that monetization/payout work happens.
  adUnlockCount:{type:Number,default:0},
  // Auto-generated (Gemini) timestamped transcript, used for the
  // synced/karaoke-style highlighting view. Separate from the plain
  // `transcript` field above, which stays editable/manual.
  transcriptSegments:{type:[TranscriptSegmentSchema],default:[]},
  transcriptStatus:{type:String,enum:["none","pending","ready","failed"],default:"none"},
},{timestamps:true});
const SeriesSchema = new Schema({
  title:{type:String,required:true}, description:{type:String,required:true},
  coverImage:{type:String,default:""}, genre:{type:String,required:true},
  language:{type:String,default:"English"}, narrator:{type:String,default:""},
  // `rating` starts as a seeded placeholder for empty catalog content;
  // once real reviews exist it's recomputed as their true average and
  // `ratingCount` switches from 0 to the real review count. See
  // app/api/series/[id]/reviews/route.ts.
  rating:{type:Number,default:4.5}, ratingCount:{type:Number,default:0},
  totalEpisodes:{type:Number,default:0},
  episodes:[EpSchema], tags:[String],
  isFeatured:{type:Boolean,default:false}, isTrending:{type:Boolean,default:false},
  totalPlays:{type:Number,default:0},

  // Creator account that owns this series. Optional so house/seeded
  // content can exist before real creator accounts do.
  creatorId:{type:String,index:true},

  // Average episode length in minutes. Stored rather than computed on
  // read because the "Under 10 minutes" rail filters on it, and
  // averaging every episode's duration per request doesn't scale.
  avgMinutes:{type:Number,default:0},

  // Vibe keys (see VIBES in types/index.ts) powering Discover's
  // "tell us the vibe" picker.
  vibes:[String],
},{timestamps:true});

// Language and vibe are both filter-first fields on Discover.
SeriesSchema.index({ language: 1 });
SeriesSchema.index({ vibes: 1 });

// Enterprise base fields: publicId, status, visibility, audit
// (createdBy/updatedBy/deletedBy), soft delete, schemaVersion.
// visibility defaults to "public" here since series are catalog content.
applyBaseSchema(SeriesSchema, { visibilityDefault: "public" });

export const SeriesModel = mongoose.models.Series || mongoose.model("Series",SeriesSchema);
