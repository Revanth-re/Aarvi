export type Theme = "midnight"|"forest"|"desert"|"ocean"|"rose"|"mono";

export interface Episode {
  _id: string; title: string; description: string;
  duration: number; audioUrl: string; episodeNumber: number;
  isLocked: boolean; transcript: string; playCount: number; createdAt: string;
}
export interface Series {
  _id: string; title: string; description: string; coverImage: string;
  genre: string; language: string; narrator: string; rating: number;
  totalEpisodes: number; episodes: Episode[]; tags: string[];
  isFeatured: boolean; isTrending: boolean; totalPlays: number; createdAt: string;
}
export interface Product {
  _id: string; name: string; description: string; price: number;
  images: string[]; category: "accessories"|"clothing"|"handicrafts"|"merchandise";
  relatedSeries: string; stock: number; rating: number; reviews: number;
  tags: string[]; createdAt: string;
}
export interface CartItem { product: Product; quantity: number; }
