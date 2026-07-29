# SWARA FM — full app rebuild

This is a **complete replacement** for your `aarvi` app, not a patch.
Delete your old `app/`, `components/`, `lib/`, `models/`, `store/` and
`types/` folders and drop these in, or unzip over the project and then
run the cleanup list at the bottom.

Keep your own `.env.local`, `public/uploads/` and `node_modules/`.

```bash
npm install     # pusher + pusher-js removed; nothing new added
npm run dev
```

Then, logged in, POST once to seed the demo catalog:

```
POST /api/seed/swara?userId=<your user id>
```

---

## What was removed (as agreed)

- **E-commerce** — shop, cart, products, `ProductCard`, `ProductForm`,
  `models/Product.ts`, `/api/products`, `/admin/products`.
- **Listen-together rooms** — `/listen`, `/api/rooms`, the Pusher chat
  panel, member list, reaction overlay, `pusherClient`/`pusherServer`.
  Both `pusher` packages are gone from `package.json`.
- The old desktop marketing homepage, the desktop navbar, the 980-line
  `MiniPlayer` (rewritten without room code), and the squad-streak
  feature from the previous pass (not in these designs).

**The admin panel was kept**, per your answer — it's the only way to
create series and attach audio.

## The shell

`components/shell/` — `TopBar`, `BottomNav`, `Player`, `ClientRoot`,
`ThemeSync`, `SettingsSync`, `ToastHost`, `ListeningTracker`.

The app now renders at phone proportions at every screen size, centred
with a 480px max width on desktop (`.app-frame`). That's a deliberate
call: the designs are a phone app, and stretching a mobile layout
across 1440px looks broken. The admin panel opts out and stays
full-width. Reverting is a one-line change in `globals.css`.

## Screens (all 11)

| Screen | Route | Notes |
|---|---|---|
| Home | `/` | Stories, streak strip, Continue listening, Trending, Under 10 min, Thoughts |
| Library | `/library` | Saved / Downloads / History / Thoughts |
| Shorts | `/shorts` | Vertical reels |
| Discover | `/discover` | Vibe picker, language filter, Following, creators, Matched |
| Profile | `/profile` | Listening DNA, stats, thoughts, recently played |
| Coins | `/coins` | Balance, earn, packs, ledger |
| Search | `/search` | Series + creators + thoughts, voice input |
| Notifications | `/notifications` | All / Drops / Social / Coins |
| Settings | `/settings` | Appearance, notifications, playback, sleep, downloads, privacy |
| Messages | `/messages` | DM list + threads |
| Creator Studio | `/creator` | Plays, followers, your series |

## Things worth knowing

**Thoughts** are the feature that makes this app distinct, so they're
built properly: `models/Thought.ts` stores `atSec`, the second in the
episode the note was left at. "Jump to moment" seeks the player to it.
Author names are *not* denormalised onto each thought — the feed joins
the User collection, so a rename or new avatar updates every thought
the person ever left instead of leaving stale copies everywhere.

**Stories** expire two ways: a Mongo TTL index *and* an explicit
`expiresAt > now` filter on every read. The TTL reaper only runs about
once a minute, so without the read filter a story would linger visibly
past its expiry.

**Theme system** was rebuilt for your Settings screen: six palettes
(Lavender, Rose gold, Mint, Cyber blue, Peach, Midnight) × light/dark,
plus System which follows the OS live. A blocking inline script in
`layout.tsx` applies the saved theme before first paint, otherwise
every load flashes lavender-light for one frame.

**Shorts** uses one shared `<audio>` element for the whole feed, not
one per card — mobile browsers cap concurrent media elements and ~20
of them silently stop playing partway down.

**Listening DNA** percentages are corrected so they total exactly 100.
Naive rounding gives you a profile that adds up to 99%.

### ⚠️ Money and ads — read this

`POST /api/coins` with `action: "buy"` returns **501** unless
`DEMO_WALLET=true`. Granting currency from an unverified client request
would let anyone mint coins with curl.

**The "watch an ad" reward is credited by the app itself, not by an ad
network.** It's capped at 5/day to limit the damage, but before you
ship this with real ads, move the credit behind the network's
server-side reward callback. This is flagged in the code too.

---

## Verification

- **`npm run build` passes** — 64 routes, all 43 pages generated.
- **`tsc --noEmit` clean** across the project.
- **60 unit tests written and passing** over the pure logic: day
  arithmetic across month/year/leap boundaries, every streak
  transition, level thresholds and clamping, DNA percentages summing
  to 100 (including the 33/33/33 rounding trap), coin caps, count and
  time formatting, deterministic gradients/waveforms, handle
  generation, conversation-key ordering.
- **`npm run lint` adds zero new errors.** 9 errors remain, all in
  files I didn't write (`admin/layout.tsx`, `admin/page.tsx`,
  `rbac/roles`, `login/client.tsx`, `baseSchemaPlugin.ts`).

**One test caught a real bug**: my `formatCount` rendered 18,400,000 as
"18M" when your screenshots clearly show **18.4M**, and 110,200 as
"110K" instead of **110.2K**. Fixed — one decimal is now always kept,
and abbreviation only starts at 10,000 so a thought with 1,284 likes
still reads "1,284" exactly as in the mock.

### What I could NOT verify

**No database was available, so nothing ran end to end and no screen
was rendered in a browser.** Types, build and pure logic are verified;
runtime behaviour against MongoDB is not. Check these first:

1. Run the seeder, confirm Home fills with content.
2. Post a story; confirm it appears in the rail and dies after 24h.
3. Leave a thought, then tap "jump to moment" from the Home feed.
4. Switch palette + dark mode in Settings; reload and confirm it sticks.
5. Claim the daily reward twice — the second must be refused.

### ⚠️ Seed caveat

The seeder creates episodes with an **empty `audioUrl`** — it can't
invent licensed audio. Browsing, thoughts, coins, streaks, search,
settings and themes all work immediately, but **playback and the
Shorts feed will have nothing to play** until you attach real audio
via Admin → Audio Series. The player says so on screen rather than
failing silently.

Cover art is likewise blank; cards fall back to a deterministic
gradient until you upload real covers.

## Not built (deliberately, rather than faked)

- **Offline downloads** — the settings persist, but there's no service
  worker or cache. Audio still streams. The Library tab says so.
- **Comments on shorts** — the button toasts "not built".
- **Creator recording / AI voice tools** — Creator Studio reports on
  series you upload through admin; it doesn't produce audio.
- **Real payments and real ads** — see the warning above.
- **Push notifications** — notifications are in-app only; the Settings
  toggles are stored but nothing reads them at send time yet.
- **Google login is still broken** — that's the `NEXTAUTH_URL` /
  `NEXT_PUBLIC_BASE_URL` mismatch from earlier, untouched by this pass.

## Cleanup list (if you unzip over the old project)

Delete these leftovers, which are no longer imported:

```
app/shop  app/cart  app/listen  app/wallet  app/premium
app/api/products  app/api/rooms  app/api/cart  app/api/seed/route.ts
app/api/squad  app/api/users/[id]/wallet  app/admin/products
app/profile/client.tsx  app/profile/ProfileRouter.tsx
components/mobile/  components/Navbar.tsx  components/HomePageClient.tsx
components/SeriesCard.tsx  components/SeriesPageClient.tsx
components/SeriesDetailClient.tsx  components/EpisodeRow.tsx
components/ProductCard.tsx  components/ProductDetailClient.tsx
components/ShopPageClient.tsx  components/CartPageClient.tsx
components/ThemeProvider.tsx  components/ThemeSelector.tsx
components/admin/ProductForm.tsx
components/ui/Navbar.tsx  components/ui/MiniPlayer.tsx
components/ui/ClientRoot.tsx  components/ui/ToastHost.tsx
components/ui/NotificationBell.tsx  components/ui/ThemeInit.tsx
components/ui/ListeningTracker.tsx  components/ui/HoverBridge.tsx
components/ui/MemberList.tsx  components/ui/RoomChatPanel.tsx
components/ui/ReactionOverlay.tsx  components/ui/BottomNav.tsx
models/Product.ts  models/Squad.ts
lib/pusherClient.ts  lib/pusherServer.ts  lib/chatEmojis.ts
lib/chatSound.ts  lib/seedData.ts  lib/useGamification.ts
lib/useResponsive.ts
SeriesCard.tsx  globals.css   (stale root duplicates)
```
