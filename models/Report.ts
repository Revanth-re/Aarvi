import { Schema, models, model } from "mongoose";

// One model for both copyright takedowns and general abuse reports —
// they're the same workflow underneath: someone flags a specific
// episode/Story/Thought, the owner can track what happened to their
// report or to the report filed against them, and an admin reviews it
// in the moderation log (status + actionTaken + who/when).
const ReportSchema = new Schema({
  reporterId:   { type: String, required: true },
  reporterName: { type: String, default: "" },

  targetType: { type: String, enum: ["episode", "story", "thought"], required: true },
  targetId:   { type: String, required: true },
  /** The series an episode belongs to (or that an episode-copyright
   *  claim points at) — lets "reports on your content" resolve a
   *  title without a second lookup per row. */
  seriesId:   { type: String, default: "" },

  /** The account whose content this is. Denormalized at creation time
   *  (not derived live) so a later edit/transfer of the target doesn't
   *  retroactively change who can see the report's status. */
  ownerId: { type: String, required: true },

  category: { type: String, enum: ["copyright", "abuse", "spam", "other"], required: true },
  details:  { type: String, required: true, trim: true, maxlength: 1000 },

  // Copyright claims only.
  claimantName:  { type: String, default: "" },
  claimantEmail: { type: String, default: "" },

  status:      { type: String, enum: ["pending", "reviewing", "actioned", "dismissed"], default: "pending" },
  actionTaken: { type: String, enum: ["none", "hidden", "removed", "approved"], default: "none" },
  reviewedBy:  { type: String, default: "" },
  reviewedAt:  { type: Date },

  createdAt: { type: Date, default: Date.now },
});

ReportSchema.index({ ownerId: 1, createdAt: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });

export const ReportModel = models.Report ?? model("Report", ReportSchema);
