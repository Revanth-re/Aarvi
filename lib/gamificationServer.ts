import { UserModel } from "@/models/User";
import { SquadModel } from "@/models/Squad";
import { CoinTxModel } from "@/models/CoinTx";
import { Gamification, CoinReason } from "@/types";
import {
  advanceStreak, checkinReward, dayKey, hourOfDay, earnedBadges,
  levelFromSeconds, BADGE_REWARD_COINS,
} from "./gamification";

// Server-side gamification engine. Everything that can change a user's
// streak/coins/badges funnels through here so the rules live in exactly
// one place — the API routes just call it and return the result.

/* eslint-disable @typescript-eslint/no-explicit-any */
type UserDoc = any;

/**
 * Credit or debit coins and write the ledger row in one place.
 * Mutates `user` in memory; the caller is responsible for saving.
 * Returns the new balance.
 *
 * A debit that would overdraw is clamped at zero rather than throwing —
 * callers that care (spending) check the balance *before* calling.
 */
export async function recordCoins(
  user: UserDoc, amount: number, reason: CoinReason, note = ""
): Promise<number> {
  const current = user.coins ?? 0;
  const next = Math.max(0, current + amount);
  user.coins = next;

  await CoinTxModel.create({
    userId: user._id.toString(),
    amount, reason, note,
    balanceAfter: next,
    createdAt: new Date(),
  });

  return next;
}

/** Shape the stored fields into the client-facing Gamification object. */
export function toGamification(user: UserDoc, today = dayKey()): Gamification {
  const lvl = levelFromSeconds(user.listenSeconds ?? 0);
  const premiumUntil: Date | null = user.premiumUntil ?? null;

  return {
    streak: user.streak ?? 0,
    longestStreak: user.longestStreak ?? 0,
    checkedInToday: (user.lastListenDate ?? "") === today,
    coins: user.coins ?? 0,
    listenSeconds: user.listenSeconds ?? 0,
    hours: lvl.hours,
    level: lvl.level,
    levelTitle: lvl.title,
    nextLevelHours: lvl.nextLevelHours,
    badges: user.badges ?? [],
    isPremium: !!premiumUntil && premiumUntil.getTime() > Date.now(),
    premiumUntil: premiumUntil ? premiumUntil.toISOString() : null,
  };
}

export interface SyncOptions {
  /** Seconds of listening to add. 0 is valid — use it for a plain read. */
  addSeconds?: number;
  /** Injectable clock, so this is testable without freezing time. */
  now?: Date;
}

export interface SyncResult {
  gamification: Gamification;
  /** Badge keys newly earned by THIS call — the client toasts them. */
  newBadges: string[];
  /** Coins granted by THIS call (check-in + badge rewards). */
  coinsAwarded: number;
  /** True if this call was the day's first listen. */
  checkedIn: boolean;
}

/**
 * The one entry point that advances a user's gamification state.
 *
 * Safe to call on every player heartbeat: the streak only advances on
 * a calendar-day change, badges are computed by diffing against what's
 * already stored, and the check-in payout is gated on the same
 * transition — so repeated calls within a day are no-ops for rewards.
 */
export async function syncGamification(
  userId: string, opts: SyncOptions = {}
): Promise<SyncResult | null> {
  const { addSeconds = 0, now = new Date() } = opts;

  const user = await UserModel.findById(userId);
  if (!user) return null;

  const today = dayKey(now);
  let coinsAwarded = 0;
  let checkedIn = false;

  // ── 1. Listening time ──
  // Clamped: a heartbeat should never report more than a few minutes,
  // so anything larger is a bug or a forged request, not real listening.
  if (addSeconds > 0) {
    user.listenSeconds = (user.listenSeconds ?? 0) + Math.min(addSeconds, 900);

    // Night Owl is a "has ever happened" flag, so once true it stays.
    const h = hourOfDay(now);
    if (h >= 0 && h < 4) user.nightOwl = true;

    // ── 2. Streak ──
    const s = advanceStreak(
      user.lastListenDate ?? "", user.streak ?? 0, user.longestStreak ?? 0, today
    );
    user.streak = s.streak;
    user.longestStreak = s.longestStreak;
    user.lastListenDate = today;

    if (s.incrementedToday) {
      checkedIn = true;
      const reward = checkinReward(s.streak);
      await recordCoins(user, reward, "daily_checkin", `Day ${s.streak} check-in`);
      coinsAwarded += reward;
    }
  }

  // ── 3. Badges ──
  // Squad streak is read (not written) here; the squad's own streak is
  // advanced by the /api/squad route, which owns that state.
  let squadStreak = 0;
  if (user.squadId) {
    const squad = await SquadModel.findById(user.squadId).lean<any>();
    squadStreak = squad?.streak ?? 0;
  }

  const should = earnedBadges({
    streak: user.streak ?? 0,
    listenSeconds: user.listenSeconds ?? 0,
    nightOwl: !!user.nightOwl,
    shortsLiked: user.shortsLiked ?? 0,
    favoritesCount: (user.favorites ?? []).length,
    seriesCompleted: user.seriesCompleted ?? 0,
    squadStreak,
  });

  const have: string[] = user.badges ?? [];
  const newBadges = should.filter(k => !have.includes(k));

  if (newBadges.length) {
    user.badges = [...have, ...newBadges];
    const reward = newBadges.length * BADGE_REWARD_COINS;
    await recordCoins(user, reward, "badge_reward", newBadges.join(", "));
    coinsAwarded += reward;
  }

  await user.save();

  return {
    gamification: toGamification(user, today),
    newBadges,
    coinsAwarded,
    checkedIn,
  };
}
