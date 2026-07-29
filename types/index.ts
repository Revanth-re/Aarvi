// ── Enterprise base fields (see lib/db/baseSchemaPlugin.ts) ──
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
  _id: string; key: string; name: string; description?: string;
  isSystem: boolean; permissions?: string[];
}
export interface Permission extends Partial<BaseEntity> {
  _id: string; key: string; name: string; description?: string; module: string;
}
export interface AuditLogEntry {
  _id: string; entityType: string; entityId: string;
  action: "create" | "update" | "delete" | "restore";
  actorId: string | null; before: unknown; after: unknown; createdAt: string;
}

// ══════════════════════════════════════════════════════════
// Appearance
// ══════════════════════════════════════════════════════════
// Settings → Appearance is two independent choices: a palette
// ("screen tab colour") and a mode. They're stored separately and
// combined into the `data-theme` attribute, so picking a new colour
// keeps whatever light/dark preference you already had.
export type ThemeColor =
  | "lavender" | "rosegold" | "mint" | "cyberblue" | "peach" | "midnight";
export type ThemeMode = "light" | "dark" | "system";
export type TabBarStyle = "transparent" | "normal";

export const THEME_COLORS: { key: ThemeColor; label: string; dot: string }[] = [
  { key: "lavender",  label: "Lavender",   dot: "#8B5CF6" },
  { key: "rosegold",  label: "Rose gold",  dot: "#E0716B" },
  { key: "mint",      label: "Mint",       dot: "#12A87C" },
  { key: "cyberblue", label: "Cyber blue", dot: "#2D7FF0" },
  { key: "peach",     label: "Peach",      dot: "#EE8B3C" },
  { key: "midnight",  label: "Midnight",   dot: "#4B4BA8" },
];

// ══════════════════════════════════════════════════════════
// Catalog
// ══════════════════════════════════════════════════════════
export const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Bengali"] as const;
export type Language = (typeof LANGUAGES)[number];

export interface TranscriptSegment { text: string; start: number; end: number; }

export interface Episode {
  _id: string; title: string; description: string;
  duration: number; audioUrl: string; episodeNumber: number;
  isLocked: boolean; transcript: string; playCount: number; createdAt: string;
  transcriptSegments?: TranscriptSegment[];
  transcriptStatus?: "none" | "pending" | "ready" | "failed";
}

export interface Series extends Partial<BaseEntity> {
  _id: string; title: string; description: string; coverImage: string;
  genre: string; language: string; narrator: string; rating: number;
  totalEpisodes: number; episodes: Episode[]; tags: string[];
  isFeatured: boolean; isTrending: boolean; totalPlays: number; createdAt: string;
  /** Creator account that owns this series, if any. */
  creatorId?: string;
  /** Average episode length in minutes — drives the "Under 10 minutes" rail. */
  avgMinutes?: number;
  /** Vibe keys this series is tagged with (see VIBES). */
  vibes?: string[];
}

export interface PlaylistItem { seriesId: string; episodeId?: string; addedAt: string; }
export interface Playlist { _id: string; name: string; items: PlaylistItem[]; createdAt: string; }

// ══════════════════════════════════════════════════════════
// User + settings
// ══════════════════════════════════════════════════════════
export interface UserSettings {
  themeColor: ThemeColor;
  themeMode: ThemeMode;
  tabBarStyle: TabBarStyle;
  notif: {
    episodeDrops: boolean; creatorStories: boolean; coinRewards: boolean;
    thoughtReplies: boolean; weeklyRecap: boolean;
  };
  playback: {
    autoplayNext: boolean; skipIntro: boolean; fadeOnSleep: boolean; dataSaver: boolean;
  };
  /** Minutes; 0 = off, -1 = end of episode. */
  sleepTimerDefault: number;
  downloads: { wifiOnly: boolean; autoDownloadNext: boolean };
  privacy: { privateListening: boolean; allowMessages: boolean; publicThoughts: boolean };
}

export interface User extends Partial<BaseEntity> {
  _id: string; name?: string; email?: string; image?: string; createdAt: string;
  handle?: string; bio?: string;
  favorites?: string[]; playlists?: Playlist[];
  following?: string[];
  followRequestsReceived?: string[];
  followRequestsSent?: string[];
  roles?: string[];
  isCreator?: boolean;
  settings?: UserSettings;
  languages?: string[];
}

export interface FriendProgress {
  userId: string; name?: string; image?: string;
  episodeId?: string; position: number; updatedAt: string;
}

// ══════════════════════════════════════════════════════════
// Notifications
// ══════════════════════════════════════════════════════════
export type NotificationCategory = "drops" | "social" | "coins" | "system";

export interface Notification {
  _id: string; type: string; category: NotificationCategory;
  title: string; message: string; link?: string;
  fromUserId?: string; fromUserName?: string;
  read: boolean; createdAt: string;
}

// ══════════════════════════════════════════════════════════
// Shorts
// ══════════════════════════════════════════════════════════
export interface Short {
  _id: string; seriesId: string; episodeId: string;
  startSec: number; endSec: number; caption: string; hook: string;
  creatorId?: string; creatorHandle: string; gradient: string;
  likeCount: number; commentCount: number; playCount: number; createdAt: string;
}
export interface ShortFeedItem extends Short {
  seriesTitle: string; coverImage: string; audioUrl: string;
  episodeTitle: string; liked: boolean; saved: boolean;
}

// ══════════════════════════════════════════════════════════
// Stories — 24-hour posts on the home rail
// ══════════════════════════════════════════════════════════
export type StoryKind = "audio" | "photo" | "quote";

export interface Story {
  _id: string; userId: string; kind: StoryKind;
  caption: string; mediaUrl?: string;
  createdAt: string; expiresAt: string;
  viewCount: number;
}
export interface StoryGroup {
  userId: string; name: string; handle: string; image: string;
  /** Newest first. */
  stories: Story[];
  seen: boolean;
  latestKind: StoryKind;
}

// ══════════════════════════════════════════════════════════
// Thoughts — timestamped notes left inside an episode
// ══════════════════════════════════════════════════════════
export interface Thought {
  _id: string;
  userId: string; userName: string; userHandle: string; userImage: string;
  seriesId: string; seriesTitle: string;
  episodeId: string; episodeNumber: number;
  /** Seconds into the episode — this is what "jump to moment" uses. */
  atSec: number;
  text: string;
  likeCount: number; liked: boolean; replyCount: number;
  parentId?: string | null;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════
// Coins
// ══════════════════════════════════════════════════════════
export type CoinReason =
  | "daily_checkin" | "streak_bonus" | "watch_ad" | "invite_friend"
  | "badge_reward" | "unlock_episode" | "purchase" | "admin_grant";

export interface CoinTx {
  _id: string; userId: string; amount: number; reason: CoinReason;
  note?: string; balanceAfter: number; createdAt: string;
}
export interface CoinPack { key: string; coins: number; bonus: number; price: number; }

export interface WalletState {
  coins: number;
  streak: number;
  dailyClaimed: boolean;
  adsWatchedToday: number;
  adsRemainingToday: number;
  transactions: CoinTx[];
  packs: CoinPack[];
}

// ══════════════════════════════════════════════════════════
// Discover / Search
// ══════════════════════════════════════════════════════════
export interface Vibe { key: string; label: string; icon: string; match: string[]; }

export const VIBES: Vibe[] = [
  { key: "cant_sleep", label: "Can't sleep", icon: "Moon",     match: ["calm", "sleep", "slice of life", "mythology"] },
  { key: "need_hype",  label: "Need hype",   icon: "TrendingUp", match: ["thriller", "action", "adventure", "true crime"] },
  { key: "soft_hours", label: "Soft hours",  icon: "Sun",      match: ["romance", "coming of age", "comedy"] },
  { key: "wanna_cry",  label: "Wanna cry",   icon: "Sparkles", match: ["drama", "romance", "heartbreak"] },
];

export interface CreatorCard {
  _id: string; name: string; handle: string; image: string;
  followerCount: number; isFollowing: boolean;
}

export interface DiscoverPayload {
  following: { series: Series; latestEpisode?: Episode; creatorName: string }[];
  creators: CreatorCard[];
  matched: Series[];
}

export interface SearchPayload {
  series: Series[];
  creators: CreatorCard[];
  thoughts: Thought[];
  trending: string[];
}

// ── Listening DNA (Profile) ──
export interface DnaSlice { genre: string; percent: number; }

// ══════════════════════════════════════════════════════════
// Messages
// ══════════════════════════════════════════════════════════
export interface MessageItem {
  _id: string; conversationId: string; senderId: string;
  text: string; createdAt: string; read: boolean;
}
export interface Conversation {
  _id: string;
  participants: { _id: string; name: string; handle: string; image: string }[];
  lastMessage?: MessageItem;
  unread: number;
  updatedAt: string;
}
