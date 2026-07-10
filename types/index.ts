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
export interface Series {
  _id: string; title: string; description: string; coverImage: string;
  genre: string; language: string; narrator: string; rating: number;
  totalEpisodes: number; episodes: Episode[]; tags: string[];
  isFeatured: boolean; isTrending: boolean; totalPlays: number; createdAt: string;
}
export interface Product {
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
export interface User {
  _id: string; name?: string; email?: string; image?: string; createdAt: string;
  favorites?: string[]; playlists?: Playlist[];
  following?: string[];
  // Instagram-style follow requests — see models/User.ts for the full
  // explanation of why "followers" isn't stored directly.
  followRequestsReceived?: string[];
  followRequestsSent?: string[];
}

export interface FriendProgress {
  userId: string; name?: string; image?: string;
  episodeId?: string; position: number; updatedAt: string;
}

export interface Notification {
  _id: string; type: string; message: string; link?: string;
  fromUserId?: string; fromUserName?: string; read: boolean; createdAt: string;
}
