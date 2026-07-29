# What changed — Swara-style mobile app pass

Drop these files into your `aarvi` project at the same paths,
overwriting existing ones. No `node_modules`, `.env*`, or
`public/uploads` are included.

Everything below matches the four decisions you made: responsive
(mobile shell added, desktop untouched), Shorts as episode time-ranges,
a mock coin economy with no real payments, and new screens styled from
your existing CSS theme variables so all 12 themes keep working.

---

## Run it

```bash
npm install     # no new dependencies were added
npm run dev
```

Then open the site at a phone width (or in device emulation). The
bottom tab bar appears under 768px.

To see Shorts, go to **Admin → Shorts** and cut a clip from any episode
you've already uploaded.

---

## 1. The mobile shell

`components/ui/BottomNav.tsx` — the five-tab bar (Home / Discover /
Shorts / Library / Profile). It's hidden above 768px by a CSS rule
(`.bottom-nav` in `app/globals.css`), so **your desktop layout, navbar
and admin panel are completely unchanged**.

`lib/useResponsive.ts` — a `useIsMobile()` hook built on
`useSyncExternalStore`. Used in exactly two places, `app/page.tsx` and
the new `app/profile/ProfileRouter.tsx`, to pick which experience to
render. Rendering one *or* the other (rather than both with CSS hiding
one) means the hidden tree never fires its data fetches.

`app/globals.css` gained a `--nav-h` variable, and the mini player got
a `.mini-player-bar` class so it lifts above the tab bar on mobile
instead of being covered by it.

`MiniPlayer` is now also hidden on `/shorts`, for the same reason it
was already hidden on `/admin` and `/listen`: the Shorts feed owns its
own `<audio>` element, and two sets of transport controls would let you
drive two audio sources at once.

## 2. Shorts

`models/Short.ts` — a Short stores `seriesId + episodeId + startSec +
endSec`, **not an audio file**. Consequences worth knowing:

- No new uploads are needed to populate the feed.
- "from &lt;Series&gt;" always links somewhere real.
- Re-encoding an episode never orphans its clips.
- `GET /api/shorts` skips clips whose series or episode has since been
  deleted, rather than shipping a card that can't play.

`components/mobile/ShortsFeed.tsx` — full-screen scroll-snapped feed
with a waveform, like/comment/share/save rail and creator attribution.
It uses **one shared `<audio>` element** for the whole feed rather than
one per card: mobile browsers cap concurrent media elements, and ~20 of
them would silently stop playing partway down. `IntersectionObserver`
retargets that element as cards scroll into view, and playback loops
within the clip's time range.

Likes are stored as an array of user IDs, not a counter, so a double-tap
or a retried request can't inflate the count.

`app/admin/shorts/page.tsx` — pick a series, an episode, a start and an
end time. Accepts `0:30` or `45`. Rejects clips over 90 seconds and
validates that the episode actually exists before saving.

## 3. Gamification

`lib/gamification.ts` holds every rule as **pure functions** — levels,
badges, streak transitions, coin rewards, moods. That's deliberate:
they're the parts most likely to be wrong, and pure functions are the
parts you can actually test. `lib/gamificationServer.ts` is the only
thing that writes them to the database.

**Streaks** are calendar-day based, computed in a fixed timezone
(`Asia/Kolkata`) rather than server-local time — otherwise a function
running in UTC and a user in India disagree about when "today" ends and
streaks break at 5:30am for everyone. The transition is idempotent: a
second call on the same day is a no-op, so the player heartbeat can
fire as often as it likes without inflating anything.

**Levels** come from lifetime hours listened (11 tiers, Newcomer →
Immortal). **Badges** are computed by diffing "what you should have"
against "what's stored", so they self-heal if a counter is ever
corrected, and re-running the check is always safe.

**Squad streaks** (`models/Squad.ts`) are the social version: everyone
in the group has to listen each day or it resets for all of them.
`checkins` is stored as a day → userIds map rather than a counter,
because the rule needs to answer "did *every* member check in on day
X?", which a counter can't answer once membership changes. Evaluation
is lazy (on read) and guarded by `lastEvaluated` so it runs at most
once per day however often the endpoint is hit.

`components/ui/ListeningTracker.tsx` — headless, mounted in
`ClientRoot`. Turns playback time into streak progress. It caps each
reported interval, because browsers throttle timers in background tabs
and crediting a ten-minute gap as listening would be wrong.

## 4. Coins, wallet and premium

Coins are earned (daily check-in scaled by streak length, badge
unlocks, full-squad days) and spent (unlocking a locked episode for 50).
`models/CoinTx.ts` is an append-only ledger recording the balance after
every change, so a wrong balance can always be traced to the
transaction that caused it.

Unlocking an episode is recorded **on the user**, not on the episode —
flipping `isLocked` on the series document would unlock it for
everybody. Re-requesting an unlock you already own returns success
without charging again.

### ⚠️ On payments — read this

**No real money is processed anywhere in this code, by design.**

`POST /api/users/[id]/wallet` returns **501** unless `DEMO_WALLET=true`
is set. Granting coins on an unverified client request would let anyone
mint currency for free by calling the endpoint directly with curl — a
real integration needs server-side order creation plus signature
verification of the provider's webhook. The Premium screen is the
upsell only; it charges and activates nothing.

The plumbing for later is in place: `premiumUntil` exists on the user
model and every perk is gated on it, so a verified webhook just needs
to set that date.

## 5. Smaller changes to existing files

- `models/User.ts` — added `coins`, `listenSeconds`, `streak`,
  `longestStreak`, `lastListenDate`, `badges`, `shortsLiked`,
  `seriesCompleted`, `nightOwl`, `squadId`, `unlockedEpisodes`,
  `premiumUntil`. All additive with safe defaults, so **every existing
  user document keeps working with no migration** — a missing field
  reads as 0/""/[], which is exactly "brand new player".
- `app/api/series/route.ts` — added `?mood=` and `?sort=new`. The mood
  filter combines with `?search=` via `$and` so one `$or` can't
  silently overwrite the other.
- `types/index.ts` — new types only; nothing existing changed.
- `app/admin/layout.tsx` — one new nav entry.

---

## Verification

- **`npm run build` passes.** Full production build, all 37 routes
  compiled, no errors.
- **`tsc --noEmit` is clean** across the whole project.
- **37 unit tests written and passing** against the pure logic in
  `lib/gamification.ts` — day arithmetic across month, year and leap-day
  boundaries; every streak transition case; level thresholds and
  clamping; badge implication rules; coin caps; count formatting.
- **`npm run lint` adds zero new errors.** Your project starts at 25
  eslint errors; it still has exactly 25 after this pass. (Those 25 are
  pre-existing — mostly `set-state-in-effect` in `MiniPlayer`,
  `NotificationBell`, `profile/client.tsx` and others, plus two `any`s
  in `baseSchemaPlugin.ts`. I didn't fix them; that's a separate
  cleanup and touching those files wasn't in scope.) The new code does
  add ~9 `exhaustive-deps` *warnings*, matching the existing style in
  your codebase.

### What I could NOT verify

I had no database to point at, so **none of this was run against real
data** — no route was executed end to end, and no screen was rendered
in a browser. Type-correctness, build success and the pure logic are
verified; runtime behaviour against MongoDB is not. Worth doing before
you ship:

1. Create a Short in the admin panel and confirm it plays in the feed.
2. Play something and confirm the streak increments once, not per
   heartbeat.
3. Create a squad, check in from two accounts, confirm the bonus pays
   once.

## Not done / worth knowing

- **Comments on Shorts** — the button is there and toasts "coming
  soon". `commentCount` exists on the model; there's no comment
  collection yet.
- **Library → History** — your app stores per-series playback position
  (`models/Progress.ts`) but not a time-ordered play log, so the tab
  says so plainly rather than showing invented data. Adding it means
  writing one row per play.
- **Deleting Shorts** — no `DELETE /api/shorts/[id]` route yet, so the
  admin screen doesn't show a delete button. I'd rather ship no button
  than one that 404s.
- **The Shorts "save" button** toasts but doesn't persist yet.
- **`seriesCompleted` is never incremented** — the Completionist badge
  is wired end to end but nothing currently detects finishing a series.
  That needs a hook in the player when the last episode ends.
- **Continue-listening** picks your first favorite rather than genuinely
  most-recent, because there's no recents log (same gap as History).
- Notifications, follows and rooms were left exactly as they were.
