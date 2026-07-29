// ── Enterprise base fields (see lib/db/baseSchemaPlugin.ts) ──
// Shared by every major entity: Series, Product, User, Role,
// Permission, RolePermission.
export interface BaseEntity {
  publicId: string;
  status: "active" | "inactive" | "archived" | "pending";
  visibility: "public" | "private" | "unlisted";
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  deletedAt: string | null;
  schemaVersion: number;
}

export interface Role extends Partial<BaseEntity> {
  _id: string;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions?: string[]; // permission keys granted to this role
}

export interface Permission extends Partial<BaseEntity> {
  _id: string;
  key: string;
  name: string;
  description?: string;
  module: string;
}

export interface AuditLogEntry {
  _id: string;
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete" | "restore";
  actorId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export type Theme =
  | "midnight-dark" | "midnight-light"
  | "forest-dark"   | "forest-light"
  | "desert-dark"   | "desert-light"
  | "ocean-dark"    | "ocean-light"
  | "rose-dark"     | "rose-light"
  | "mono-dark"     | "mono-light";

export interface TranscriptSegment { text: string; start: number; end: number; }

export interface Episode {
  _id: string; title: string; description: string;
  duration: number; audioUrl: string; episodeNumber: number;
  isLocked: boolean; transcript: string; playCount: number; createdAt: string;
  // Auto-generated (Gemini) timestamped transcript for the synced/
  // karaoke-style highlighted view — separate from the plain manual
  // `transcript` field above.
  transcriptSegments?: TranscriptSegment[];
  transcriptStatus?: "none" | "pending" | "ready" | "failed";
}
export interface Series extends Partial<BaseEntity> {
  _id: string; title: string; description: string; coverImage: string;
  genre: string; language: string; narrator: string; rating: number;
  totalEpisodes: number; episodes: Episode[]; tags: string[];
  isFeatured: boolean; isTrending: boolean; totalPlays: number; createdAt: string;
}
export interface Product extends Partial<BaseEntity> {
  _id: string; name: string; description: string; price: number;
  originalPrice?: number;
  images: string[]; category: "accessories"|"clothing"|"handicrafts"|"merchandise";
  relatedSeries?: string; stock: number; rating: number; reviews?: number;
  tags: string[]; isFeatured: boolean; createdAt: string;
}
export interface CartItem { product: Product; quantity: number; }

export interface PlaylistItem {
  seriesId: string; episodeId?: string; addedAt: string;
}
export interface Playlist {
  _id: string; name: string; items: PlaylistItem[]; createdAt: string;
}
export interface User extends Partial<BaseEntity> {
  _id: string; name?: string; email?: string; image?: string; createdAt: string;
  favorites?: string[]; playlists?: Playlist[];
  following?: string[];
  // Instagram-style follow requests — see models/User.ts for the full
  // explanation of why "followers" isn't stored directly.
  followRequestsReceived?: string[];
  followRequestsSent?: string[];
  roles?: string[]; // Role._id strings — see lib/rbac.ts
}

export interface FriendProgress {
  userId: string; name?: string; image?: string;
  episodeId?: string; position: number; updatedAt: string;
}

export interface Notification {
  _id: string; type: string; message: string; link?: string;
  fromUserId?: string; fromUserName?: string; read: boolean; createdAt: string;
}

// ══════════════════════════════════════════════════════════════
// Shorts — vertical audio-reel feed
// ══════════════════════════════════════════════════════════════
// A Short is NOT a separate audio upload. It's a *time range* into an
// episode you already have (`startSec` → `endSec`), so the feed reuses
// existing audio and "from <Series>" always links somewhere real.
export interface Short {
  _id: string;
  seriesId: string;
  episodeId: string;
  startSec: number;
  endSec: number;
  caption: string;
  creatorId?: string;
  creatorHandle: string;
  gradient: string;      // CSS background used behind the waveform
  likeCount: number;
  commentCount: number;
  playCount: number;
  createdAt: string;
}

// What /api/shorts actually returns: the Short plus the denormalised
// bits the feed needs to render and play without an extra round trip.
export interface ShortFeedItem extends Short {
  seriesTitle: string;
  coverImage: string;
  audioUrl: string;
  episodeTitle: string;
  liked: boolean;
}

// ══════════════════════════════════════════════════════════════
// Gamification — streaks, levels, badges, coins
// ══════════════════════════════════════════════════════════════
export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  /** lucide-react icon name, resolved client-side in BadgeChip. */
  icon: string;
}

export interface Gamification {
  streak: number;
  longestStreak: number;
  checkedInToday: boolean;
  coins: number;
  listenSeconds: number;
  hours: number;
  level: number;
  levelTitle: string;
  /** Hours needed to reach the next level; null once max level. */
  nextLevelHours: number | null;
  badges: string[];       // BadgeDef keys the user has earned
  isPremium: boolean;
  premiumUntil: string | null;
}

export type CoinReason =
  | "daily_checkin" | "streak_bonus" | "squad_bonus" | "badge_reward"
  | "unlock_episode" | "purchase" | "admin_grant";

export interface CoinTx {
  _id: string;
  userId: string;
  amount: number;         // positive = earned, negative = spent
  reason: CoinReason;
  note?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface CoinPack {
  key: string; coins: number; price: number; bonus?: string;
}

// ── Squad streak: a small group that has to *all* listen each day ──
export interface SquadMemberView {
  userId: string; name: string; image: string; checkedIn: boolean;
}
export interface SquadView {
  _id: string;
  name: string;
  ownerId: string;
  goalMinutes: number;
  streak: number;
  longestStreak: number;
  members: SquadMemberView[];
  checkedInToday: boolean;   // has the *current* user checked in
  allCheckedIn: boolean;
}

// ── Mood picker ──
export interface Mood {
  key: string;
  label: string;
  emoji: string;
  /** Series tags/genres this mood maps onto. */
  match: string[];
}

// ── Discover screen payload ──
export interface RisingCreator {
  _id: string; name: string; handle: string; image: string;
  followerCount: number; isFollowing: boolean;
}
export interface DiscoverPayload {
  trendingTags: string[];
  genres: { name: string; count: number; gradient: string }[];
  creators: RisingCreator[];
}
