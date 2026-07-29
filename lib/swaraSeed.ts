import { handleFrom } from "./gamification";

// Demo catalog matching the design screenshots. Real editable records —
// once seeded these behave exactly like content you added yourself, and
// can be renamed or deleted from the admin panel.
//
// Cover art is intentionally left blank: the seeder can't invent
// licensed artwork, so cards fall back to their deterministic gradient
// until you upload real covers. Audio is likewise blank except where
// noted; see the SEED CAVEAT in CHANGES-swara-app.md.

export interface SeedEpisode {
  title: string; description: string; minutes: number; locked?: boolean;
}
export interface SeedSeries {
  title: string; description: string; genre: string; language: string;
  narratorHandle: string; rating: number; plays: number;
  tags: string[]; vibes: string[];
  trending?: boolean; featured?: boolean;
  episodes: SeedEpisode[];
}
export interface SeedCreator {
  name: string; email: string; bio: string; followers: number;
}

export const SEED_CREATORS: SeedCreator[] = [
  { name: "Ira Nandakumar", email: "ira@swara.demo",   bio: "urban thrillers, mostly at night", followers: 31300 },
  { name: "Kabir Sen",      email: "kabir@swara.demo", bio: "mythology, retold loud",           followers: 110200 },
  { name: "Meera Joshi",    email: "meera@swara.demo", bio: "romance that ruins your evening",  followers: 17200 },
  { name: "Nila Raghavan",  email: "nila@swara.demo",  bio: "binaural horror. headphones on.",  followers: 8400 },
  { name: "Dev Anand M",    email: "dev@swara.demo",   bio: "true crime, receipts included",    followers: 12900 },
];

const ep = (title: string, description: string, minutes: number, locked = false): SeedEpisode =>
  ({ title, description, minutes, locked });

export const SEED_SERIES: SeedSeries[] = [
  {
    title: "Neon Monsoon",
    description:
      "A missing-persons case cracks open during Mumbai's worst monsoon in forty years, " +
      "and the only witness is a ringtone nobody can place.",
    genre: "Thriller", language: "English", narratorHandle: "Ira Nandakumar",
    rating: 4.8, plays: 18_400_000,
    tags: ["urban thriller", "mystery", "rain", "mumbai"],
    vibes: ["need_hype"], trending: true, featured: true,
    episodes: [
      ep("The first call",      "A number that shouldn't exist rings at 3am.", 24),
      ep("Wet concrete",        "Priya retraces a route that no longer exists.", 22),
      ep("He knew her ringtone","Sixty seconds that break the whole case open.", 26),
      ep("Everything after",    "The tape is real. That's the problem.", 28, true),
    ],
  },
  {
    title: "Moonblood Kingdom",
    description:
      "The old gods kept one promise and broke every other. A retelling of the " +
      "lunar dynasty, narrated like a war record.",
    genre: "Mythology", language: "Hindi", narratorHandle: "Kabir Sen",
    rating: 4.9, plays: 42_100_000,
    tags: ["mythology", "epic", "war", "gods"],
    vibes: ["need_hype", "cant_sleep"], trending: true, featured: true,
    episodes: [
      ep("The vow at moonrise", "Every dynasty starts with a lie told well.", 31),
      ep("Iron and milk",       "The first betrayal is domestic.", 29),
      ep("What the drums said", "A battle told entirely through percussion.", 34),
      ep("The last inheritance","Nobody wins. Somebody survives.", 30, true),
    ],
  },
  {
    title: "Rooftop Hearts",
    description:
      "Two people keep meeting on the same terrace at the same wrong time. " +
      "A slow romance told across one Chennai summer.",
    genre: "Romance", language: "Tamil", narratorHandle: "Meera Joshi",
    rating: 4.7, plays: 27_600_000,
    tags: ["romance", "slow burn", "chennai", "summer"],
    vibes: ["soft_hours", "wanna_cry"], trending: true,
    episodes: [
      ep("Terrace, 7pm",      "Neither of them is supposed to be here.", 8),
      ep("Borrowed umbrella", "A small kindness with consequences.", 9),
      ep("The wrong festival","He remembers the date. She remembers the year.", 7),
    ],
  },
  {
    title: "House of Veils",
    description:
      "Recorded binaurally inside a house that shouldn't echo. Wear headphones, " +
      "or don't bother.",
    genre: "Horror", language: "Telugu", narratorHandle: "Nila Raghavan",
    rating: 4.6, plays: 9_800_000,
    tags: ["horror", "binaural", "paranormal", "house"],
    vibes: ["cant_sleep"],
    episodes: [
      ep("Room with no echo", "The microphone hears something the crew doesn't.", 9),
      ep("Second floor",      "Footsteps arrive before the person does.", 8),
      ep("The veil room",     "A bonus chapter, recorded on location.", 10),
    ],
  },
  {
    title: "Starlight Static",
    description:
      "A night-shift radio host takes calls from listeners who can't sleep. " +
      "Some of them aren't calling from anywhere.",
    genre: "Coming of Age", language: "Malayalam", narratorHandle: "Meera Joshi",
    rating: 4.8, plays: 6_300_000,
    tags: ["radio", "night", "lonely", "comfort"],
    vibes: ["cant_sleep", "soft_hours"],
    episodes: [
      ep("Signal check",    "Hello to everyone still awake.", 6),
      ep("Caller nine",     "She's been calling for eleven years.", 7),
      ep("Dead air",        "The only silence that ever scared him.", 8),
    ],
  },
  {
    title: "The 11:47",
    description:
      "Every night the same train passes, and every night one more passenger " +
      "doesn't get off.",
    genre: "Mystery", language: "English", narratorHandle: "Dev Anand M",
    rating: 4.5, plays: 12_200_000,
    tags: ["mystery", "true crime", "train", "commute"],
    vibes: ["need_hype", "cant_sleep"],
    episodes: [
      ep("Platform four",  "The timetable says this train doesn't exist.", 7),
      ep("Ticketless",     "A conductor who remembers every face.", 9),
      ep("Terminus",       "Where the line actually ends.", 8, true),
    ],
  },
];

// Thoughts from the Home screenshot, plus a couple more. `at` is
// seconds into the episode — the timestamp that makes "jump to
// moment" mean something.
export const SEED_THOUGHTS = [
  { author: "raysofmaya",    series: "Neon Monsoon",      episode: 4, at: 372, text: "the pause before she says his name did something to my chest", likes: 1284 },
  { author: "midnight.arjun",series: "Moonblood Kingdom", episode: 3, at: 760, text: "bro the drums here are illegal. adding this to my gym playlist.", likes: 892 },
  { author: "chaiandchaos",  series: "Rooftop Hearts",    episode: 2, at: 235, text: "listening at 1.5x because I have no patience but full commitment", likes: 431 },
  { author: "raysofmaya",    series: "House of Veils",    episode: 1, at: 118, text: "took my headphones off at 1:58 and put them right back on. respect.", likes: 209 },
  { author: "midnight.arjun",series: "Starlight Static",  episode: 2, at: 96,  text: "caller nine broke me. that's it, that's the note.", likes: 174 },
];

// Listener accounts that leave the thoughts above.
export const SEED_LISTENERS = [
  { name: "Maya Rao",     email: "maya@swara.demo",     handle: "raysofmaya" },
  { name: "Arjun Nair",   email: "arjun@swara.demo",    handle: "midnight.arjun" },
  { name: "Sneha Iyer",   email: "sneha@swara.demo",    handle: "chaiandchaos" },
];

export const SEED_STORIES = [
  { author: "Ira Nandakumar", kind: "audio" as const, caption: "recorded ep 13's ending twice. kept the shaky one." },
  { author: "Kabir Sen",      kind: "quote" as const, caption: "\"Every dynasty starts with a lie told well.\"" },
  { author: "Meera Joshi",    kind: "photo" as const, caption: "the actual terrace" },
  { author: "Nila Raghavan",  kind: "audio" as const, caption: "raw room tone from the veil room. no edits." },
  { author: "Dev Anand M",    kind: "quote" as const, caption: "\"The timetable says this train doesn't exist.\"" },
];

export const SEED_SHORTS = [
  { series: "Neon Monsoon",      episode: 3, start: 0, end: 58, caption: "He knew her ringtone", hook: "60 seconds that break the whole case open.", creator: "Ira Nandakumar" },
  { series: "Moonblood Kingdom", episode: 3, start: 120, end: 175, caption: "What the drums said", hook: "No dialogue. Just percussion and a war.", creator: "Kabir Sen" },
  { series: "Rooftop Hearts",    episode: 1, start: 30, end: 82, caption: "Terrace, 7pm", hook: "Two people, one wrong time, zero excuses.", creator: "Meera Joshi" },
  { series: "House of Veils",    episode: 1, start: 90, end: 140, caption: "Room with no echo", hook: "Headphones on. Trust me.", creator: "Nila Raghavan" },
];

export const SEED_NOTIFICATIONS = [
  { category: "drops"  as const, type: "episode_drop",  title: "Neon Monsoon · Ep 13 is live", message: "New episode from a series in your library.", hoursAgo: 0.1 },
  { category: "coins"  as const, type: "daily_reward",  title: "+40 coins earned",             message: "Your daily streak reward is ready to claim.", hoursAgo: 1 },
  { category: "social" as const, type: "thought_reply", title: "raysofmaya replied to your thought", message: "\"same, I rewound it four times\"", hoursAgo: 3 },
  { category: "drops"  as const, type: "episode_drop",  title: "Fresh in Horror",              message: "House of Veils dropped a binaural bonus chapter.", hoursAgo: 8 },
  { category: "system" as const, type: "product",       title: "Sleep timer improved",         message: "Timers now fade out audio instead of cutting.", hoursAgo: 24 },
];

/** Stable @handle for a seeded person. */
export const seedHandle = (name: string) => handleFrom(name);
