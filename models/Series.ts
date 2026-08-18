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
  // Auto-generated (Gemini) timestamped transcript, used for the
  // synced/karaoke-style highlighting view. Separate from the plain
  // `transcript` field above, which stays editable/manual.
  transcriptSegments:{type:[TranscriptSegmentSchema],default:[]},
  transcriptStatus:{type:String,enum:["none","pending","ready","failed"],default:"none"},

  // Drafts (Creator Studio → Publishing). A draft episode is saved on
  // the series but excluded from every public read (see the isDraft
  // filters in app/api/series/route.ts and app/api/series/[id]/route.ts)
  // until the creator publishes it — one at a time, independent of the
  // rest of the series.
  isDraft:{type:Boolean,default:false},
  // Set when this episode's audio was generated from text instead of
  // uploaded, so the editor can show "Voice: Kore" and offer a
  // regenerate action. Empty for uploaded audio.
  narrationVoice:{type:String,default:""},
  // The text sent to the narrator. Kept even
  // after generating so the creator can tweak and regenerate without
  // retyping — this is deliberately separate from `transcript`, which
  // is the plain manual transcript of an already-recorded episode.
  narrationText:{type:String,default:""},

  // Cached count backed by the EpisodeLike collection (same pattern as
  // Series.rating being cached from Review documents) — so a like
  // toggle never has to fan out to every reader of this series.
  likeCount:{type:Number,default:0},

  // Quick privacy preset (Settings → quick privacy presets). "public"
  // is the historical default (unchanged behavior); "followers"
  // restricts playback to accounts following the creator; "private"
  // to the creator only. Enforced in the isDraft-style filters on
  // app/api/series/route.ts and app/api/series/[id]/route.ts.
  visibility:{type:String,enum:["public","followers","private"],default:"public"},

  // Set by an admin acting on a copyright Report (see models/Report.ts)
  // — excluded from every public read exactly like isDraft, but kept
  // on the document (not deleted) so the takedown has a record to
  // point at.
  takedownActioned:{type:Boolean,default:false},
},{timestamps:true});
const SeriesSchema = new Schema({
  title:{type:String,required:true}, description:{type:String,required:true},
  coverImage:{type:String,default:""}, genre:{type:String,required:true},
  language:{type:String,default:"English"}, narrator:{type:String,default:""},
  rating:{type:Number,default:4.5}, totalEpisodes:{type:Number,default:0},
  // Written by app/api/series/[id]/reviews/route.ts's recomputeRating().
  ratingCount:{type:Number,default:0},
  episodes:[EpSchema], tags:[String],
  isFeatured:{type:Boolean,default:false}, isTrending:{type:Boolean,default:false},
  totalPlays:{type:Number,default:0},

  // Whole-series draft — the creator is still assembling the story and
  // nothing about it (cover, episodes) shows up anywhere public yet.
  // Independent of, and coarser than, the per-episode isDraft above:
  // a published series can still have individual draft episodes.
  isDraft:{type:Boolean,default:false},

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

  // Story credits & tags (writer, narrator, voice artist, etc.) beyond
  // the single free-text `narrator` field above. userId makes each one
  // tappable through to that person's profile; name/image are snapshot
  // at tag-time (like a film's credits roll — it shows who worked on
  // it *then*, not a live-synced mirror of their current profile).
  credits:[{
    userId: { type: String, required: true },
    name:   { type: String, default: "" },
    image:  { type: String, default: "" },
    role:   { type: String, default: "Contributor" },
  }],
},{timestamps:true});

// Language and vibe are both filter-first fields on Discover.
SeriesSchema.index({ language: 1 });
SeriesSchema.index({ vibes: 1 });

// Enterprise base fields: publicId, status, visibility, audit
// (createdBy/updatedBy/deletedBy), soft delete, schemaVersion.
// visibility defaults to "public" here since series are catalog content.
applyBaseSchema(SeriesSchema, { visibilityDefault: "public" });

export const SeriesModel = mongoose.models.Series || mongoose.model("Series",SeriesSchema);
