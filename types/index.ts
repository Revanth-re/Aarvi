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
export type ThemeColor = "lavender" | "rosegold" | "mint" | "cyberblue" | "peach" | "midnight";
export type ThemeMode = "light" | "dark" | "system";
export type TabBarStyle = "transparent" | "normal";

// Keys match the SettingsSchema enum in models/User.ts exactly — the
// server rejects anything outside that list, so don't rename these
// without updating the schema too.
export const THEME_COLORS: { key: ThemeColor; label: string; dot: string }[] = [
  { key: "lavender",  label: "Lavender",   dot: "#8B5CF6" },
  { key: "rosegold",  label: "Rose Gold",  dot: "#C77B63" },
  { key: "mint",      label: "Mint",       dot: "#17A673" },
  { key: "cyberblue", label: "Cyber Blue", dot: "#1E88E5" },
  { key: "peach",     label: "Peach",      dot: "#F0834D" },
  { key: "midnight",  label: "Midnight",   dot: "#3944A8" },
];

// ══════════════════════════════════════════════════════════
// Font style
// ══════════════════════════════════════════════════════════
// Applied app-wide as data-font="<key>" on <html>, same pattern as
// data-theme. "sora" is the original single font the app shipped
// with, kept as the default so nobody's UI changes underneath them.
export type FontStyle = "sora" | "neo" | "slab" | "rounded" | "serif" | "playful" | "handwritten" | "retro";

export const FONT_STYLES: { key: FontStyle; label: string; sub: string; preview: string }[] = [
  { key: "sora",        label: "Default",     sub: "Sora — clean & modern",        preview: "Aa" },
  { key: "neo",         label: "Neo",         sub: "Space Grotesk — geometric",     preview: "Aa" },
  { key: "slab",        label: "Slab",        sub: "Roboto Slab — bold & sturdy",   preview: "Aa" },
  { key: "rounded",     label: "Rounded",     sub: "Baloo 2 — soft & friendly",     preview: "Aa" },
  { key: "serif",       label: "Serif",       sub: "Lora — warm & literary",        preview: "Aa" },
  { key: "playful",     label: "Playful",     sub: "Fredoka — bouncy & fun",        preview: "Aa" },
  { key: "handwritten", label: "Handwritten", sub: "Caveat — personal & casual",    preview: "Aa" },
  { key: "retro",       label: "Retro",       sub: "Righteous — bold & poster-like", preview: "Aa" },
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
  /** Draft episodes are saved on the series but hidden from every
   *  public read until the creator publishes them individually. */
  isDraft?: boolean;
  /** Prebuilt voice name (see NARRATION_VOICES) if this episode's audio
   *  was generated from text rather than uploaded. Empty for uploads. */
  narrationVoice?: string;
  /** The text sent to the narrator — kept so it can be edited and
   *  regenerated without retyping. */
  narrationText?: string;
  /** Cached from the EpisodeLike collection — see /api/episodes/[id]/like. */
  likeCount?: number;
  /** Quick privacy preset — see Visibility. Defaults "public". */
  visibility?: Visibility;
}

/** One credited person on a series — writer, narrator, voice artist,
 *  etc. Tappable through to their profile via userId. */
export interface Credit {
  userId: string; name: string; image?: string; role: string;
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
  /** Whole series still being assembled — hidden from every public
   *  read until the creator publishes it. */
  isDraft?: boolean;
  /** How many Reviews back the `rating` average — see recomputeRating
   *  in app/api/series/[id]/reviews/route.ts. */
  ratingCount?: number;
  /** Writer, narrator, voice artists, etc. beyond the single free-text
   *  `narrator` field — each tappable through to their profile. */
  credits?: Credit[];
}

// ══════════════════════════════════════════════════════════
// Voice narration (Creator Studio → publish an episode from text)
// ══════════════════════════════════════════════════════════
// A curated subset of the Gemini TTS prebuilt voices — the full
// catalog has 30, which is too many to usefully browse in a picker.
// Keys must be valid `voiceName` values for speechConfig.voiceConfig
// .prebuiltVoiceConfig (see lib/tts.ts, the only other consumer).
export interface NarrationVoice { key: string; label: string; desc: string; }

export const NARRATION_VOICES: NarrationVoice[] = [
  { key: "Kore",    label: "Kore",    desc: "Firm & confident" },
  { key: "Puck",    label: "Puck",    desc: "Upbeat & playful" },
  { key: "Charon",  label: "Charon",  desc: "Informative & steady" },
  { key: "Fenrir",  label: "Fenrir",  desc: "Excitable & energetic" },
  { key: "Aoede",   label: "Aoede",   desc: "Breezy & light" },
  { key: "Leda",    label: "Leda",    desc: "Youthful & bright" },
  { key: "Orus",    label: "Orus",    desc: "Firm & grounded" },
  { key: "Zephyr",  label: "Zephyr",  desc: "Bright & clear" },
  { key: "Sulafat", label: "Sulafat", desc: "Warm & soothing" },
  { key: "Achird",  label: "Achird",  desc: "Friendly & natural" },
];

export interface PlaylistItem { seriesId: string; episodeId?: string; addedAt: string; }
export interface Playlist { _id: string; name: string; items: PlaylistItem[]; createdAt: string; }

// ══════════════════════════════════════════════════════════
// User + settings
// ══════════════════════════════════════════════════════════
export interface UserSettings {
  themeColor: ThemeColor;
  themeMode: ThemeMode;
  tabBarStyle: TabBarStyle;
  fontStyle: FontStyle;
  notif: {
    episodeDrops: boolean; creatorStories: boolean; coinRewards: boolean;
    thoughtReplies: boolean; weeklyRecap: boolean;
    /** Device push notifications for new DMs — see lib/push.ts. */
    newMessages: boolean;
    /** New follower, a tip received, and a new Story from someone you
     *  follow — the three additional push triggers from the
     *  Notifications & Privacy settings page (see /settings/notifications). */
    follows: boolean; tips: boolean; storyUpdates: boolean;
  };
  /** Push notifications are suppressed (but the in-app notification is
   *  still written) between start and end, both "HH:mm" 24h local time.
   *  Wraps past midnight if start > end (e.g. 22:00–07:00). */
  quietHours: { enabled: boolean; start: string; end: string };
  playback: {
    autoplayNext: boolean; skipIntro: boolean; fadeOnSleep: boolean; dataSaver: boolean;
  };
  /** Minutes; 0 = off, -1 = end of episode. */
  sleepTimerDefault: number;
  downloads: { wifiOnly: boolean; autoDownloadNext: boolean };
  privacy: {
    privateListening: boolean; allowMessages: boolean; publicThoughts: boolean;
    /** Private account: follows need approval instead of auto-accepting. */
    isPrivate: boolean;
  };
}

export interface User extends Partial<BaseEntity> {
  _id: string; name?: string; email?: string; image?: string; createdAt: string;
  handle?: string; bio?: string; mobile?: string;
  favorites?: string[]; playlists?: Playlist[];
  following?: string[];
  followRequestsReceived?: string[];
  followRequestsSent?: string[];
  roles?: string[];
  isCreator?: boolean;
  settings?: UserSettings;
  languages?: string[];
  /** "seriesId:episodeId" keys — same shape as unlockedEpisodes. */
  bookmarkedEpisodes?: string[];
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
export interface ShortComment {
  _id: string; shortId: string;
  userId: string; userName: string; userHandle: string; userImage: string;
  text: string; createdAt: string; editedAt?: string;
  /** True when the requesting user authored it — lets the UI show
   *  edit/delete only on your own comments. */
  mine: boolean;
}

// ══════════════════════════════════════════════════════════
// Stories — 24-hour posts on the home rail
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// Visibility presets — quick per-post privacy control for episodes,
// comments (Thoughts), and Moments (Stories). "public" and "followers"
// only meaningfully differ on episodes right now (episode playback is
// the one surface that isn't already follower-scoped by default); for
// Thoughts and Stories, "followers" is the existing default behavior
// and "private" maps onto each model's existing "only me" concept —
// see the visibility filters in their respective API routes for the
// exact enforcement per surface.
// ══════════════════════════════════════════════════════════
export type Visibility = "public" | "followers" | "private";

export const VISIBILITY_OPTIONS: { key: Visibility; label: string }[] = [
  { key: "public", label: "Public" },
  { key: "followers", label: "Followers" },
  { key: "private", label: "Private" },
];

export type StoryKind = "audio" | "photo" | "quote";

export interface Story {
  _id: string; userId: string; kind: StoryKind;
  caption: string; mediaUrl?: string;
  createdAt: string; expiresAt: string;
  viewCount: number;
  /** "Only me" — hidden from everyone but the owner. */
  hidden: boolean;
  /** Only present from the archive endpoint: still within its 24h
   *  window vs. long past it. Archive shows both; the rail shows
   *  neither distinction because it only ever returns live ones. */
  live?: boolean;
  /** Quick privacy preset (see Visibility above). Defaults "followers"
   *  to match the rail's existing following-only behavior. */
  visibility?: Visibility;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  /** Set by an admin moderation action — excluded from every read
   *  except the moderation log itself. Distinct from `hidden`, which
   *  is the owner's own "only me" toggle. */
  removedByModeration?: boolean;
}

export interface StoryComment {
  _id: string; storyId: string;
  userId: string; userName: string; userHandle: string; userImage: string;
  text: string; createdAt: string;
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
  /** Quick privacy preset — see Visibility. Defaults "followers",
   *  mirroring the pre-existing isPublic-true default. */
  visibility?: Visibility;
}

// ══════════════════════════════════════════════════════════
// Coins
// ══════════════════════════════════════════════════════════
export type CoinReason =
  | "daily_checkin" | "streak_bonus" | "watch_ad" | "invite_friend"
  | "badge_reward" | "unlock_episode" | "purchase" | "admin_grant"
  | "tip_sent" | "tip_received";

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
export interface StoryRef {
  storyId: string; kind: StoryKind; mediaUrl: string; caption: string;
}
export interface MessageAttachment {
  url: string; kind: "image" | "video";
}
export interface MessageItem {
  _id: string; conversationId: string; senderId: string;
  text: string; createdAt: string; read: boolean;
  /** Present when this message is a reply to someone's story. */
  storyRef?: StoryRef;
  /** Present when the message carries an image/video/GIF instead of (or alongside) text. */
  attachment?: MessageAttachment;
}
export interface Conversation {
  _id: string;
  participants: { _id: string; name: string; handle: string; image: string }[];
  lastMessage?: MessageItem;
  unread: number;
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════
// Reports — copyright takedowns AND general abuse reports share one
// model (see models/Report.ts): a copyright claim on an episode/Story
// and an "abusive reply" report on a Thought are the same underlying
// workflow — someone flags a specific piece of content, the owner can
// track its status, and an admin reviews it in the moderation log.
// ══════════════════════════════════════════════════════════
export type ReportCategory = "copyright" | "abuse" | "spam" | "other";
export type ReportTargetType = "episode" | "story" | "thought";
export type ReportStatus = "pending" | "reviewing" | "actioned" | "dismissed";
export type ReportAction = "none" | "hidden" | "removed" | "approved";

export interface Report {
  _id: string;
  reporterId: string; reporterName: string;
  targetType: ReportTargetType; targetId: string;
  /** Series the target belongs to (the episode itself, or the series
   *  an episode-copyright-claim points at) — lets the owner's "reports
   *  on your content" view resolve titles without a second lookup. */
  seriesId?: string;
  /** The account whose content this is — resolved and denormalized at
   *  report-creation time so "status tracking for the owner" doesn't
   *  need a live join back to the (possibly since-edited) target. */
  ownerId: string;
  category: ReportCategory;
  details: string;
  /** Copyright claims only. */
  claimantName?: string;
  claimantEmail?: string;
  status: ReportStatus;
  actionTaken: ReportAction;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}
