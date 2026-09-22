import { Schema, models, model } from "mongoose";

// A claimed UPI payment, pending manual approval — no gateway, no KYC.
// The user pays via their own UPI app straight to your VPA, then
// submits the transaction reference here; an admin checks it against
// their bank/UPI app and approves, which is what actually credits coins.
const UpiClaimSchema = new Schema({
  userId:  { type: String, required: true },
  packKey: { type: String, required: true },
  amount:  { type: Number, required: true }, // rupees, for the admin's reference
  refNumber: { type: String, default: "", trim: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewedBy: { type: String, default: "" },
  reviewedAt: { type: Date },
  createdAt:  { type: Date, default: Date.now },
});

export const UpiClaimModel = models.UpiClaim ?? model("UpiClaim", UpiClaimSchema);
