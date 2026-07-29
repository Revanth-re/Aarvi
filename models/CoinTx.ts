import { Schema, models, model } from "mongoose";

// Append-only coin ledger. The authoritative balance still lives on
// User.coins (so reads are a single document fetch), but every change
// writes a row here with the resulting balance — which means a wrong
// balance can always be traced back to the transaction that caused it.
// Deliberately NOT run through applyBaseSchema: ledger rows are never
// edited or soft-deleted, same reasoning as models/AuditLog.ts.
const CoinTxSchema = new Schema({
  userId: { type: String, required: true, index: true },

  // Positive = earned, negative = spent. Signed rather than a separate
  // "direction" field so `$sum: "$amount"` reconciles the balance.
  amount: { type: Number, required: true },

  reason: {
    type: String,
    required: true,
    enum: [
      "daily_checkin", "streak_bonus", "watch_ad", "invite_friend",
      "badge_reward", "unlock_episode", "purchase", "admin_grant",
    ],
  },
  note:         { type: String, default: "" },
  balanceAfter: { type: Number, required: true },
  createdAt:    { type: Date, default: Date.now, index: true },
});

CoinTxSchema.index({ userId: 1, createdAt: -1 });

export const CoinTxModel = models.CoinTx ?? model("CoinTx", CoinTxSchema);
