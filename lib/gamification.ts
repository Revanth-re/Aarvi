import { BadgeDef, CoinPack, Mood } from "@/types";

// ══════════════════════════════════════════════════════════════
// Calendar days
// ══════════════════════════════════════════════════════════════
// Streaks are a *calendar day* concept, so every day boundary in this
// file is computed in a single fixed timezone rather than in the
// server's local time. Otherwise a Vercel function running in UTC and
// a user in India disagree about when "today" ends, and streaks break
// at 5:30am for everyone.
export const STREAK_TIMEZONE = "Asia/Kolkata";

/** "YYYY-MM-DD" for the given instant, in STREAK_TIMEZONE. */
export function dayKey(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which sorts and compares lexically.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STREAK_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

/** Hour 0–23 for the given instant, in STREAK_TIMEZONE. */
export function hourOfDay(d: Date = new Date()): number {
  return parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: STREAK_TIMEZONE, hour: "2-digit", hour12: false,
    }).format(d),
    10
  );
}

/** The day key N days before the given one. */
export function previousDayKey(key: string, back = 1): string {
  const [y, m, d] = key.split("-").map(Number);
  // Anchored at noon UTC so a DST/offset shift can never push the
  // arithmetic onto the wrong calendar day.
  const t = Date.UTC(y, m - 1, d, 12) - back * 86_400_000;
  return dayKey(new Date(t));
}

// ══════════════════════════════════════════════════════════════
// Listener levels
// ══════════════════════════════════════════════════════════════
// Cumulative *hours listened* required to reach each level. Index 0 is
// level 1, so a brand-new account is "Level 1 Listener", not level 0.
export const LEVEL_THRESHOLDS_HOURS = [0, 1, 3, 8, 15, 30, 60, 100, 175, 300, 500];

export const LEVEL_TITLES = [
  "Newcomer", "Listener", "Regular", "Devotee", "Binger", "Enthusiast",
  "Aficionado", "Narrator", "Storykeeper", "Legend", "Immortal",
];

export interface LevelInfo {
  level: number;
  title: string;
  hours: number;
  /** Hours required for the next level, or null at max level. */
  nextLevelHours: number | null;
  /** 0–1 progress toward the next level (1 at max level). */
  progress: number;
}

export function levelFromSeconds(listenSeconds: number): LevelInfo {
  const hours = listenSeconds / 3600;

  let idx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS_HOURS.length; i++) {
    if (hours >= LEVEL_THRESHOLDS_HOURS[i]) idx = i;
  }

  const isMax = idx >= LEVEL_THRESHOLDS_HOURS.length - 1;
  const floor = LEVEL_THRESHOLDS_HOURS[idx];
  const next = isMax ? null : LEVEL_THRESHOLDS_HOURS[idx + 1];

  return {
    level: idx + 1,
    title: LEVEL_TITLES[idx] ?? "Listener",
    hours: Math.round(hours * 10) / 10,
    nextLevelHours: next,
    progress: next === null ? 1 : Math.min(1, (hours - floor) / (next - floor)),
  };
}

// ══════════════════════════════════════════════════════════════
// Badges
// ══════════════════════════════════════════════════════════════
export const BADGES: BadgeDef[] = [
  { key: "first_listen",  name: "First Listen",     description: "Played your first episode",              icon: "Play" },
  { key: "streak_3",      name: "3-Day Streaker",   description: "Listened 3 days in a row",               icon: "Flame" },
  { key: "streak_7",      name: "7-Day Streaker",   description: "Listened 7 days in a row",               icon: "Flame" },
  { key: "streak_12",     name: "12-Day Streaker",  description: "Listened 12 days in a row",              icon: "Flame" },
  { key: "streak_30",     name: "30-Day Streaker",  description: "A full month, every single day",         icon: "Flame" },
  { key: "night_owl",     name: "Night Owl",        description: "Listened between midnight and 4am",      icon: "Moon" },
  { key: "ten_hours",     name: "10 Hours In",      description: "Listened for 10 hours total",            icon: "Headphones" },
  { key: "top_listener",  name: "Top 1% Listener",  description: "Listened for 100 hours total",           icon: "Crown" },
  { key: "beam_star",     name: "Beam Star",        description: "Kept a squad streak alive for 7 days",   icon: "Sparkles" },
  { key: "shorts_fan",    name: "Shorts Fan",       description: "Liked 25 shorts",                        icon: "Heart" },
  { key: "collector",     name: "Collector",        description: "Saved 10 series to your favorites",      icon: "Bookmark" },
  { key: "completionist", name: "Completionist",    description: "Finished every episode of a series",     icon: "CheckCircle2" },
];

export const BADGE_BY_KEY: Record<string, BadgeDef> =
  Object.fromEntries(BADGES.map(b => [b.key, b]));

/** Coins granted the first time a badge is earned. */
export const BADGE_REWARD_COINS = 50;

export interface BadgeContext {
  streak: number;
  listenSeconds: number;
  nightOwl: boolean;
  shortsLiked: number;
  favoritesCount: number;
  seriesCompleted: number;
  squadStreak: number;
}

/**
 * Pure function: given the user's counters, which badge keys *should*
 * they have? Callers diff this against what's stored and award the
 * difference — which means badges self-heal if a counter is corrected
 * later, and re-running it is always safe.
 */
export function earnedBadges(ctx: BadgeContext): string[] {
  const hours = ctx.listenSeconds / 3600;
  const out: string[] = [];

  if (ctx.listenSeconds > 0)   out.push("first_listen");
  if (ctx.streak >= 3)         out.push("streak_3");
  if (ctx.streak >= 7)         out.push("streak_7");
  if (ctx.streak >= 12)        out.push("streak_12");
  if (ctx.streak >= 30)        out.push("streak_30");
  if (ctx.nightOwl)            out.push("night_owl");
  if (hours >= 10)             out.push("ten_hours");
  if (hours >= 100)            out.push("top_listener");
  if (ctx.squadStreak >= 7)    out.push("beam_star");
  if (ctx.shortsLiked >= 25)   out.push("shorts_fan");
  if (ctx.favoritesCount >= 10) out.push("collector");
  if (ctx.seriesCompleted >= 1) out.push("completionist");

  return out;
}

// ══════════════════════════════════════════════════════════════
// Streaks
// ══════════════════════════════════════════════════════════════
export interface StreakResult {
  streak: number;
  longestStreak: number;
  /** True only on the transition — used to decide whether to pay out. */
  incrementedToday: boolean;
}

/**
 * Pure streak transition. Three cases:
 *   • same day  → no change (idempotent; call it as often as you like)
 *   • yesterday → +1
 *   • older/never → reset to 1 (today still counts)
 */
export function advanceStreak(
  lastListenDate: string,
  streak: number,
  longestStreak: number,
  today: string = dayKey()
): StreakResult {
  if (lastListenDate === today) {
    return { streak, longestStreak, incrementedToday: false };
  }
  const next = lastListenDate === previousDayKey(today) ? streak + 1 : 1;
  return {
    streak: next,
    longestStreak: Math.max(longestStreak, next),
    incrementedToday: true,
  };
}

// ══════════════════════════════════════════════════════════════
// Coin economy (soft currency — no real money, see WALLET note)
// ══════════════════════════════════════════════════════════════
export const COINS_PER_CHECKIN = 10;
/** Extra coins per streak day, capped so long streaks don't runaway. */
export const COINS_PER_STREAK_DAY = 2;
export const MAX_STREAK_BONUS_DAYS = 10;
/** Cost to unlock one locked episode with coins. */
export const UNLOCK_EPISODE_COST = 50;
/** Paid out to every member on a day the whole squad checks in. */
export const SQUAD_BONUS_COINS = 25;

export function checkinReward(streak: number): number {
  return COINS_PER_CHECKIN
    + Math.min(streak, MAX_STREAK_BONUS_DAYS) * COINS_PER_STREAK_DAY;
}

// Coin packs are intentionally NOT wired to a payment provider. The
// purchase route is a stub that refuses to grant coins unless the app
// is explicitly in demo mode — see app/api/users/[id]/wallet/route.ts.
export const COIN_PACKS: CoinPack[] = [
  { key: "starter", coins: 500,  price: 49 },
  { key: "popular", coins: 1200, price: 99,  bonus: "+20% bonus" },
  { key: "mega",    coins: 3000, price: 199, bonus: "+50% bonus" },
];

// ══════════════════════════════════════════════════════════════
// Moods
// ══════════════════════════════════════════════════════════════
// `match` entries are matched case-insensitively against a series'
// genre AND its tags, so a mood works whether you tagged a show
// "horror" or filed it under the Horror genre.
export const MOODS: Mood[] = [
  { key: "heartbroken", label: "Heartbroken", emoji: "💔", match: ["romance", "drama", "heartbreak", "love"] },
  { key: "hyped",       label: "Hyped",       emoji: "⚡", match: ["thriller", "action", "adventure", "cyber"] },
  { key: "spooked",     label: "Spook me",    emoji: "🕷️", match: ["horror", "paranormal", "supernatural"] },
  { key: "chill",       label: "Chill",       emoji: "🌙", match: ["slice of life", "comedy", "feel good", "calm"] },
  { key: "nostalgic",   label: "Nostalgic",   emoji: "📻", match: ["folklore", "historical", "classic", "mythology"] },
  { key: "curious",     label: "Curious",     emoji: "🔍", match: ["true crime", "mystery", "sci-fi", "documentary"] },
];

export const MOOD_BY_KEY: Record<string, Mood> =
  Object.fromEntries(MOODS.map(m => [m.key, m]));

// ══════════════════════════════════════════════════════════════
// Presentation helpers
// ══════════════════════════════════════════════════════════════
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

/** Deterministic gradient for a string — same series, same colors. */
export function gradientFor(seed: string): string {
  const PAIRS = [
    ["#f0629a", "#e0703c"], ["#1f9e8f", "#0d5f6e"], ["#f0563c", "#c94ba0"],
    ["#7c6af7", "#c9beff"], ["#5b8def", "#9b6bf5"], ["#e05a2b", "#f0a13c"],
    ["#22c55e", "#0ea5e9"], ["#f43f5e", "#8b5cf6"],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const [a, b] = PAIRS[Math.abs(hash) % PAIRS.length];
  return `linear-gradient(160deg,${a},${b})`;
}
