import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Episode, Series, User, UserSettings, ThemeColor, ThemeMode, TabBarStyle,
} from "@/types";

// ══════════════════════════════════════════════════════════
// Default settings
// ══════════════════════════════════════════════════════════
// Every screen reads settings through the store, never from the server
// directly, so the UI reacts instantly to a toggle and the server sync
// happens in the background. These defaults match the Settings
// screenshot exactly.
export const DEFAULT_SETTINGS: UserSettings = {
  themeColor: "lavender",
  themeMode: "light",
  tabBarStyle: "transparent",
  notif: {
    episodeDrops: true, creatorStories: true, coinRewards: true,
    thoughtReplies: true, weeklyRecap: false,
  },
  playback: {
    autoplayNext: true, skipIntro: true, fadeOnSleep: true, dataSaver: false,
  },
  sleepTimerDefault: 0,
  downloads: { wifiOnly: true, autoDownloadNext: false },
  privacy: { privateListening: false, allowMessages: true, publicThoughts: true },
};

/**
 * Resolve the stored colour + mode into the `data-theme` value.
 * "system" follows the OS, which is why this needs to run in the
 * browser rather than being baked in at build time.
 */
export function resolveTheme(color: ThemeColor, mode: ThemeMode): string {
  let resolved: "light" | "dark";
  if (mode === "system") {
    resolved = typeof window !== "undefined"
      && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } else {
    resolved = mode;
  }
  return `${color}-${resolved}`;
}

// ══════════════════════════════════════════════════════════
// Player
// ══════════════════════════════════════════════════════════
interface PlayerStore {
  ep: Episode | null; series: Series | null; playing: boolean;
  progress: number; duration: number; volume: number; rate: number;
  // A one-shot "seek to this time" request. Anything that wants to jump
  // playback (a thought's "jump to moment", the transcript view) sets
  // this; the player — the only thing that owns the <audio> element —
  // applies it and clears it. Kept separate from `progress`, which just
  // reports where playback currently is, so the two don't fight.
  seekRequest: number | null;
  /** Minutes remaining on the sleep timer; 0 = off. */
  sleepMinutes: number;

  setEp: (ep: Episode, s: Series) => void;
  setPlaying: (v: boolean) => void;
  setProgress: (v: number) => void;
  setDuration: (v: number) => void;
  setVolume: (v: number) => void;
  setRate: (v: number) => void;
  requestSeek: (t: number) => void;
  clearSeekRequest: () => void;
  setSleepMinutes: (m: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const usePlayer = create<PlayerStore>()(persist((set, get) => ({
  ep: null, series: null, playing: false,
  progress: 0, duration: 0, volume: 0.9, rate: 1,
  seekRequest: null, sleepMinutes: 0,

  setEp: (ep, s) => set({ ep, series: s, playing: true, progress: 0, seekRequest: null }),
  setPlaying: (v) => set({ playing: v }),
  setProgress: (v) => set({ progress: v }),
  setDuration: (v) => set({ duration: v }),
  setVolume: (v) => set({ volume: v }),
  setRate: (v) => set({ rate: v }),
  requestSeek: (t) => set({ seekRequest: t }),
  clearSeekRequest: () => set({ seekRequest: null }),
  setSleepMinutes: (m) => set({ sleepMinutes: m }),
  close: () => set({ ep: null, series: null, playing: false, progress: 0 }),

  next: () => {
    const { ep, series } = get();
    if (!ep || !series) return;
    const i = series.episodes.findIndex(e => e._id === ep._id);
    if (i > -1 && i < series.episodes.length - 1) {
      set({ ep: series.episodes[i + 1], playing: true, progress: 0, seekRequest: null });
    }
  },
  prev: () => {
    const { ep, series } = get();
    if (!ep || !series) return;
    const i = series.episodes.findIndex(e => e._id === ep._id);
    if (i > 0) set({ ep: series.episodes[i - 1], playing: true, progress: 0, seekRequest: null });
  },
  // Only volume/rate persist. Persisting `playing` would make the app
  // try to auto-play on load, which browsers block anyway.
}), { name: "swara-player", partialize: (s) => ({ volume: s.volume, rate: s.rate }) }));

// ══════════════════════════════════════════════════════════
// App (user, settings, local likes)
// ══════════════════════════════════════════════════════════
interface AppStore {
  user: User | null;
  settings: UserSettings;
  /** Favourites for signed-out visitors; merged on login. */
  liked: string[];
  /** Story groups already viewed this session, for the seen ring. */
  seenStories: string[];

  setUser: (u: User | null) => void;
  setSettings: (patch: Partial<UserSettings>) => void;
  setThemeColor: (c: ThemeColor) => void;
  setThemeMode: (m: ThemeMode) => void;
  setTabBarStyle: (s: TabBarStyle) => void;
  toggleLike: (id: string) => void;
  markStorySeen: (userId: string) => void;
}

export const useApp = create<AppStore>()(persist((set) => ({
  user: null,
  settings: DEFAULT_SETTINGS,
  liked: [],
  seenStories: [],

  setUser: (u) => set((s) => ({
    user: u,
    // Adopt the account's saved settings on login, but keep the local
    // defaults for anything the account hasn't set yet.
    settings: u?.settings ? { ...DEFAULT_SETTINGS, ...u.settings } : s.settings,
  })),

  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  setThemeColor: (c) => set((s) => ({ settings: { ...s.settings, themeColor: c } })),
  setThemeMode: (m) => set((s) => ({ settings: { ...s.settings, themeMode: m } })),
  setTabBarStyle: (t) => set((s) => ({ settings: { ...s.settings, tabBarStyle: t } })),

  toggleLike: (id) => set((s) => ({
    liked: s.liked.includes(id) ? s.liked.filter(x => x !== id) : [...s.liked, id],
  })),

  markStorySeen: (userId) => set((s) => (
    s.seenStories.includes(userId) ? s : { seenStories: [...s.seenStories, userId] }
  )),
}), { name: "swara-app" }));

// ══════════════════════════════════════════════════════════
// Toasts
// ══════════════════════════════════════════════════════════
export type ToastType = "success" | "error" | "info";
export interface ToastItem { id: number; message: string; type: ToastType; }

interface ToastStore {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, type = "info") => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), 2800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
