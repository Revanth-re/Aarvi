import { UserModel } from "@/models/User";
import { CoinTxModel } from "@/models/CoinTx";
import { CoinReason } from "@/types";
import { advanceStreak, dailyGoalReward, dayKey, hourOfDay, levelFromSeconds } from "./gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */
type UserDoc = any;

// Every path that can change a user's coins or streak funnels through
// here, so the rules live in exactly one place and the API routes just
// call it and return the result.

/**
 * Credit or debit coins and write the ledger row together.
 * Mutates `user` in memory — the caller saves. Returns the new balance.
 * A debit that would overdraw is clamped at zero; callers that care
 * (spending) check the balance *before* calling.
 */
export async function recordCoins(
  user: UserDoc, amount: number, reason: CoinReason, note = ""
): Promise<number> {
  const next = Math.max(0, (user.coins ?? 0) + amount);
  user.coins = next;
  await CoinTxModel.create({
    userId: user._id.toString(), amount, reason, note,
    balanceAfter: next, createdAt: new Date(),
  });
  return next;
}

export interface HeartbeatResult {
  coins: number;
  streak: number;
  longestStreak: number;
  hours: number;
  level: number;
  levelTitle: string;
  /** True only on the day's first qualifying listen. */
  checkedIn: boolean;
  coinsAwarded: number;
}

/**
 * The listening heartbeat. Safe to call on a timer: the streak only
 * advances on a calendar-day change and the payout is gated on that
 * same transition, so repeated calls within a day award nothing extra.
 */
export async function recordListening(
  userId: string, seconds: number, now = new Date()
): Promise<HeartbeatResult | null> {
  const user = await UserModel.findById(userId);
  if (!user) return null;

  const today = dayKey(now);
  let coinsAwarded = 0;
  let checkedIn = false;

  if (seconds > 0) {
    // Clamped: a heartbeat should never report more than a few minutes,
    // so anything larger is a bug or a forged request, not listening.
    user.listenSeconds = (user.listenSeconds ?? 0) + Math.min(seconds, 900);

    const h = hourOfDay(now);
    if (h >= 0 && h < 4) user.nightOwl = true;

    const s = advanceStreak(user.lastListenDate ?? "", user.streak ?? 0, user.longestStreak ?? 0, today);
    user.streak = s.streak;
    user.longestStreak = s.longestStreak;
    user.lastListenDate = today;

    if (s.incrementedToday) {
      checkedIn = true;
      const reward = dailyGoalReward(s.streak);
      await recordCoins(user, reward, "daily_checkin", `Day ${s.streak} streak`);
      coinsAwarded += reward;
    }
  }

  await user.save();
  const lvl = levelFromSeconds(user.listenSeconds ?? 0);

  return {
    coins: user.coins ?? 0,
    streak: user.streak ?? 0,
    longestStreak: user.longestStreak ?? 0,
    hours: lvl.hours,
    level: lvl.level,
    levelTitle: lvl.title,
    checkedIn,
    coinsAwarded,
  };
}
