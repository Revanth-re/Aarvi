# What changed — Foundation pass (typography + enterprise data-layer base)

This zip contains only new/modified files — drop them into your `aarvi`
project at the same paths, overwriting existing ones. No `node_modules`,
`.env*`, or `public/uploads` are included.

Scope note: the brief that triggered this pass described an enterprise
platform on the scale of Spotify/Netflix/Discord (~70 DB modules,
payments, subscriptions, wallets, badges, analytics, a NestJS-style
Prisma/DTO/Controller/Repository stack) — that's realistically months
of work, not one pass. Per your answers, this pass deliberately stuck
to two things: (1) the brand typography system, and (2) a real,
backward-compatible enterprise foundation for your **existing**
Next.js + MongoDB/Mongoose stack (not a Prisma rewrite), so nothing
that currently works stops working.

## 1. Brand typography system

- `app/fonts/QuickBaby-G3Evm.otf` — your uploaded brand font, now
  loaded locally (not from Google Fonts / a CDN).
- `lib/fonts.ts` — loads it via `next/font/local` as `fontDisplay`,
  exposed as the `--font-display` CSS variable. Your `tailwind.config.ts`
  already expected this variable (`font-display` utility) — it was
  wired up but never actually populated before this.
- `app/layout.tsx` — applies `fontDisplay.variable` on `<html>` so
  `--font-display` is available everywhere.
- Applied `font-display` to: the navbar logo/brand name
  (`components/ui/Navbar.tsx`), the homepage hero heading
  (`app/page.tsx`), and the login screen's logo + heading
  (`app/login/client.tsx`).
- Body text, forms, buttons, cards, admin panels etc. are untouched —
  they keep using Sora (`--ff-sans`), which was already loaded via the
  Google Fonts `<link>` tag in `app/layout.tsx`.
- **Not done**: I didn't touch every card/banner in the app (that's a
  much larger sweep across a design-system-sized surface). The utility
  class is centralized now (`className="font-display"`), so extending
  it to more components is a one-line change per component going
  forward.
- **License flag**: the font's `info.txt` marks it as "Demo" licensing
  from FontSpace. Worth confirming you have a commercial-use license
  before shipping this to production/millions of users — I can't
  verify licensing terms for you.

## 2. Enterprise data-layer foundation (MongoDB/Mongoose, not Prisma)

New: `lib/db/baseSchemaPlugin.ts` — a Mongoose plugin (`applyBaseSchema`)
that adds to any schema, without touching `_id` or breaking any
existing string-id references (`favorites: [String]`, `seriesId`, etc.):

- `publicId` — a real UUID (via Node's `crypto.randomUUID()`), separate
  from Mongo's `_id`, for external-facing IDs (public APIs/webhooks)
  later.
- `status` (`active` / `inactive` / `archived` / `pending`)
- `visibility` (`public` / `private` / `unlisted`)
- `createdBy`, `updatedBy`, `deletedBy` (string ids)
- `deletedAt` + soft delete: default `find`/`count` queries
  automatically exclude soft-deleted docs. This is backward compatible
  — `{ deletedAt: null }` matches both "field missing" (every existing
  document) and "explicitly null", so nothing that exists today gets
  hidden. Call `.withDeleted()` on a query to see soft-deleted docs too
  (e.g. an admin trash view). `doc.softDelete(userId)` /
  `doc.restore(userId)` instance methods included.
- `schemaVersion` for future document versioning/migrations.
- Ensures `createdAt`/`updatedAt` timestamps are auto-managed.

Applied to the three entities that are clearly "major" content/account
entities right now: `models/User.ts`, `models/Series.ts`,
`models/Product.ts`. **Not yet applied** to `models/Progress.ts` or
`models/Notification.ts` — kept out of scope to limit blast radius on
this pass; adding them later is a 2-line change each (import + one
call), same as what was done here.

### Real RBAC (Roles / Permissions / Role Permissions)

New models: `models/Role.ts`, `models/Permission.ts`,
`models/RolePermission.ts` (join table), plus `models/AuditLog.ts`
(append-only, records create/update/delete/restore with before/after
snapshots — not run through the soft-delete plugin, audit rows are
never edited).

`lib/rbac.ts` — `userHasPermission(user, "series:create")` etc. This
is **additive**: it checks the granular Role→Permission grants, but
falls back to your existing `isAdminEmail` allow-list
(`lib/admin.ts`) as a super-admin bypass. So your current admin check
keeps working exactly as before, and routes can migrate to granular
permissions one at a time whenever you're ready — nothing breaks today.

`lib/audit.ts` — `writeAuditLog(...)` helper, swallows its own errors
so a logging failure never breaks the request that triggered it.

New API routes (admin-gated the same way every other admin route in
the app already is, via `requireAdmin`):
- `POST /api/admin/rbac/seed` — idempotent seed of a starter
  permission/role catalog (`moderator`, `creator`, `support` roles with
  sensible starter grants). Safe to call more than once.
- `GET /api/admin/rbac/roles` — list roles with their granted
  permission keys, for a future admin RBAC screen.
- `POST /api/admin/rbac/roles` — create a custom role.

`models/User.ts` gained a `roles: [String]` field (Role `_id`s granted
to that user) — empty by default, purely additive.

`types/index.ts` — added `BaseEntity`, `Role`, `Permission`,
`AuditLogEntry` types; `Series`, `Product`, and `User` now extend
`Partial<BaseEntity>` so existing code that doesn't know about the new
fields still compiles unchanged.

## Verification

- Ran an isolated TypeScript strict-mode check (`tsc --noEmit`) against
  every new/modified `.ts` file in this drop (models, lib, API routes,
  types) — no errors.
- Checked the edited `.tsx` files (`layout.tsx`, `Navbar.tsx`,
  `page.tsx`, `login/client.tsx`) for brace/paren balance after the
  targeted string replacements — clean. Couldn't run a full
  `next build` in this pass (the sandbox's local `node_modules` got
  into a corrupted state mid-session from an interrupted install
  unrelated to these changes); recommend running `npm run build`
  once after dropping these files in, as a final check on your end.

## Not done / worth knowing (honest list)

- No Prisma/PostgreSQL migration — you chose to keep Mongoose, so this
  builds real DTO-less-but-structured layers on top of what exists
  instead of a rewrite.
- No payments/subscriptions/wallets/etc. — you said no real provider
  credentials yet; those modules weren't started this pass.
- No admin UI screen for managing roles/permissions yet — the API
  exists (`/api/admin/rbac/roles`), the screen doesn't.
- `Progress` and `Notification` models don't have the base
  fields/soft-delete yet.
- The admin check is still fundamentally the header-based email
  allow-list underneath (RBAC layers on top of it, doesn't replace
  it) — see the existing caveat in `lib/admin.ts`.
