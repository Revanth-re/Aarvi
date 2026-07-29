import { CoinPack, DnaSlice } from "@/types";

// ══════════════════════════════════════════════════════════
// Calendar days
// ══════════════════════════════════════════════════════════
// Streaks and "resets at midnight" limits are calendar-day concepts,
// so every day boundary is computed in one fixed timezone rather than
// the server's local time. Otherwise a function running in UTC and a
// user in India disagree about when today ends, and streaks break at
// 5:30am for everyone.
export const APP_TIMEZONE = "Asia/Kolkata";

/** "YYYY-MM-DD" for the given instant, in APP_TIMEZONE. */
export function dayKey(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which compares correctly as a string.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

/** Hour 0–23 for the given instant, in APP_TIMEZONE. */
export function hourOfDay(d: Date = new Date()): number {
  return parseInt(new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE, hour: "2-digit", hour12: false,
  }).format(d), 10);
}

/** The day key N days before the given one. */
export function previousDayKey(key: string, back = 1): string {
  const [y, m, d] = key.split("-").map(Number);
  // Anchored at noon UTC so a DST/offset shift can't land on the wrong day.
  return dayKey(new Date(Date.UTC(y, m - 1, d, 12) - back * 86_400_000));
}

// ══════════════════════════════════════════════════════════
// Streaks
// ══════════════════════════════════════════════════════════
export interface StreakResult {
  streak: number; longestStreak: number; incrementedToday: boolean;
}

/**
 * Pure streak transition:
 *   same day  → unchanged (idempotent — call it as often as you like)
 *   yesterday → +1
 *   older/never → reset to 1 (today still counts)
 */
export function advanceStreak(
  lastDate: string, streak: number, longest: number, today: string = dayKey()
): StreakResult {
  if (lastDate === today) return { streak, longestStreak: longest, incrementedToday: false };
  const next = lastDate === previousDayKey(today) ? streak + 1 : 1;
  return { streak: next, longestStreak: Math.max(longest, next), incrementedToday: true };
}

// ── Home strip: "Streak day 4 · unlocks a free episode at day 7" ──
export const FREE_EPISODE_AT_STREAK = 7;
/** Minutes of listening the daily goal asks for. */
export const DAILY_GOAL_MINUTES = 20;
/** Coins paid for hitting the daily goal. */
export const DAILY_GOAL_COINS = 40;

// ══════════════════════════════════════════════════════════
// Coin economy
// ══════════════════════════════════════════════════════════
export const COINS_DAILY_CLAIM = 10;      // "Claim daily reward"
export const COINS_PER_AD      = 20;      // "Watch a short ad"
export const MAX_ADS_PER_DAY   = 5;       // stops the ad button being a coin printer
export const COINS_PER_INVITE  = 100;     // paid when the invitee finishes ep 1
export const UNLOCK_EPISODE_COST = 50;
export const COINS_PER_STREAK_DAY = 2;
export const MAX_STREAK_BONUS_DAYS = 10;

export function dailyGoalReward(streak: number): number {
  return DAILY_GOAL_COINS
    + Math.min(streak, MAX_STREAK_BONUS_DAYS) * COINS_PER_STREAK_DAY;
}

// Prices/bonuses match the Coins screen exactly.
export const COIN_PACKS: CoinPack[] = [
  { key: "p300",  coins: 300,  bonus: 0,   price: 49 },
  { key: "p900",  coins: 900,  bonus: 80,  price: 129 },
  { key: "p2200", coins: 2200, bonus: 300, price: 299 },
  { key: "p5000", coins: 5000, bonus: 900, price: 599 },
];

// ══════════════════════════════════════════════════════════
// Listener level
// ══════════════════════════════════════════════════════════
export const LEVEL_HOURS  = [0, 1, 3, 8, 15, 30, 60, 100, 175, 300, 500];
export const LEVEL_TITLES = [
  "Newcomer", "Listener", "Regular", "Devotee", "Binger", "Enthusiast",
  "Aficionado", "Narrator", "Storykeeper", "Legend", "Immortal",
];

export interface LevelInfo {
  level: number; title: string; hours: number;
  nextLevelHours: number | null; progress: number;
}

export function levelFromSeconds(sec: number): LevelInfo {
  const hours = sec / 3600;
  let idx = 0;
  for (let i = 0; i < LEVEL_HOURS.length; i++) if (hours >= LEVEL_HOURS[i]) idx = i;

  const isMax = idx >= LEVEL_HOURS.length - 1;
  const floor = LEVEL_HOURS[idx];
  const next  = isMax ? null : LEVEL_HOURS[idx + 1];

  return {
    level: idx + 1,
    title: LEVEL_TITLES[idx] ?? "Listener",
    hours: Math.round(hours * 10) / 10,
    nextLevelHours: next,
    progress: next === null ? 1 : Math.min(1, (hours - floor) / (next - floor)),
  };
}

// ══════════════════════════════════════════════════════════
// Listening DNA
// ══════════════════════════════════════════════════════════
/**
 * Turn per-genre listening seconds into the percentage bars on the
 * profile. Percentages are rounded, then the largest slice absorbs the
 * rounding drift so the bars always total exactly 100 — otherwise you
 * get a profile that visibly adds up to 99%.
 */
export function listeningDna(byGenre: Record<string, number>, top = 4): DnaSlice[] {
  const total = Object.values(byGenre).reduce((a, b) => a + b, 0);
  if (total <= 0) return [];

  const sorted = Object.entries(byGenre)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);

  const subtotal = sorted.reduce((a, [, v]) => a + v, 0);
  const slices = sorted.map(([genre, v]) => ({
    genre, percent: Math.round((v / subtotal) * 100),
  }));

  const drift = 100 - slices.reduce((a, s) => a + s.percent, 0);
  if (slices.length && drift !== 0) slices[0].percent += drift;

  return slices;
}

// ══════════════════════════════════════════════════════════
// Presentation
// ══════════════════════════════════════════════════════════
/**
 * Compact counts, matching the design exactly: "18.4M", "128.4K", "1,284".
 *
 * Two deliberate choices:
 *  • One decimal is always kept for K/M — the mocks show 42.1M and
 *    110.2K, so truncating large values to "42M" would be wrong.
 *  • Abbreviation only starts at 10,000, so a thought with 1,284 likes
 *    reads "1,284" rather than a vaguer "1.3K".
 */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);

  if (abs >= 1_000_000) return trimZero(n / 1_000_000) + "M";
  if (abs >= 10_000)    return trimZero(n / 1_000) + "K";
  return Math.round(n).toLocaleString("en-IN");
}

/** 18.4 → "18.4", 18.0 → "18" — no trailing ".0". */
function trimZero(v: number): string {
  const s = v.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** "6:12" — used for thought timestamps and episode positions. */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "2h", "5m", "1d" — relative time for feeds and notifications. */
export function timeAgo(iso: string | Date): string {
  const then = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const diff = Math.max(0, Date.now() - then) / 1000;
  if (diff < 60)     return `${Math.floor(diff)}s`;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

/** Deterministic gradient for a string — same seed, same colours. */
export function gradientFor(seed: string): string {
  const PAIRS = [
    ["#B06AB3", "#4568DC"], ["#1F9E8F", "#0D5F6E"], ["#F0563C", "#C94BA0"],
    ["#8B5CF6", "#C4A6F5"], ["#5B8DEF", "#9B6BF5"], ["#E05A2B", "#F0A13C"],
    ["#22C55E", "#0EA5E9"], ["#F43F5E", "#8B5CF6"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  const [a, b] = PAIRS[Math.abs(h) % PAIRS.length];
  return `linear-gradient(160deg,${a},${b})`;
}

/** Deterministic waveform bar heights (22 bars, 22–99%). */
export function waveformBars(seed: string, count = 22): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  let state = Math.abs(h) || 1;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    out.push(22 + (state % 78));
  }
  return out;
}

/** Turn a display name into a stable @handle. */
export function handleFrom(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24) || "listener";
}
