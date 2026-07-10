# What changed

This zip contains only the new/modified files — drop them into your `aarvi` project at the same paths, overwriting existing ones. No `node_modules`, `.env*`, or `public/uploads` are included.

## 1. Admin lock (claude@adrefresh.com only)

- `lib/admin.ts` — allow-list of admin emails, read from `NEXT_PUBLIC_ADMIN_EMAILS`.
- `lib/requireAdmin.ts` — server-side check used by every admin API route.
- `lib/adminFetch.ts` — client fetch wrapper that sends the logged-in user's email so the server can check it.
- `app/admin/layout.tsx` — redirects anyone who isn't an allow-listed admin away from `/admin`.
- `components/ui/Navbar.tsx` — the Shield/admin icon now only shows for admins; added a Profile link/avatar.
- All mutation routes now reject non-admins: `app/api/series/route.ts`, `app/api/series/[id]/route.ts`, `app/api/products/route.ts`, `app/api/products/[id]/route.ts`, `app/api/upload/route.ts`, `app/api/seed/route.ts`.
- Admin pages/forms updated to send the required header: `app/admin/page.tsx`, `app/admin/series/page.tsx`, `app/admin/products/page.tsx`, `components/admin/SeriesForm.tsx`, `components/admin/ProductForm.tsx`, `components/admin/FileUpload.tsx`.

**You must add one line** to `.env.local` (and to Vercel's Project Settings → Environment Variables for production):

```
NEXT_PUBLIC_ADMIN_EMAILS=claude@adrefresh.com
```

Comma-separate multiple emails if you ever want more admins.

**Important caveat:** this is a lightweight check (client sends its email in a header, server checks it against the list) — not a cryptographic session. It stops casual/accidental access but not someone deliberately forging the header. You picked this over a full signed-session rebuild to keep it quick; if you ever want the stronger version, that's a bigger follow-up.

## 2. Accounts now store favorites & playlists (MongoDB)

- `models/User.ts` — new proper User model with `favorites: string[]` and `playlists: [{name, items, createdAt}]`.
- `app/api/auth/google/callback/route.ts` — now uses this model and returns favorites/playlists on login.
- `types/index.ts` — added `Playlist`/`PlaylistItem` types, extended `User`.
- New API routes: `app/api/users/[id]/favorites/route.ts` (GET/POST toggle), `app/api/users/[id]/playlists/route.ts` (GET/POST create), `app/api/users/[id]/playlists/[playlistId]/route.ts` (PUT add/remove item, DELETE playlist).

## 3. Series page: real favorites + "Add to Playlist"

- `app/series/[id]/page.tsx` — the Save/heart button now syncs to the account (MongoDB) when logged in, falls back to local-only for guests. New "Playlist" button opens a small modal to add the series to an existing or brand-new playlist.

## 4. Profile page

- `app/profile/page.tsx` — new page at `/profile`: avatar, name, email, join date, favorites grid (remove from favorites), playlists (create, expand, remove items, delete playlist).

## Not done / worth knowing

- Dead duplicate files from an earlier version of the app are still sitting in the project unused: `components/Navbar.tsx`, `components/SeriesDetailClient.tsx`, `components/HomePageClient.tsx`, root-level `SeriesCard.tsx`. Safe to delete, not touched here.
- No order history / checkout flow exists yet, so the profile page doesn't show past orders — only favorites and playlists as requested.
