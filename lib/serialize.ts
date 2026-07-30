/* eslint-disable @typescript-eslint/no-explicit-any */

// Mongo documents are full of ObjectIds and Dates that don't survive
// JSON in a usable shape. These helpers normalise a lean() document
// into the plain, string-id form the client types expect — done in one
// place so every route returns the same shape.

export function idOf(v: any): string {
  return v?.toString?.() ?? String(v ?? "");
}

export function iso(v: any): string {
  if (!v) return new Date(0).toISOString();
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

/** Public-safe view of a user, for feeds and cards. */
export function publicUser(u: any) {
  const name = u?.name || "Listener";
  return {
    _id: idOf(u?._id),
    name,
    handle: u?.handle ? `@${u.handle}` : "@listener",
    image: u?.image || "",
  };
}

/**
 * The full "it's me, I'm logged in" shape stored client-side by
 * useApp.setUser — matches what the Google OAuth callback has always
 * sent, so login/signup (username+password) and Google produce an
 * identical session object. Never includes `password`.
 */
export function sessionUser(u: any) {
  return {
    _id: idOf(u._id),
    name: u.name,
    email: u.email || "",
    image: u.image || "",
    handle: u.handle || "",
    createdAt: u.createdAt,
    favorites: u.favorites || [],
    following: u.following || [],
    followRequestsReceived: u.followRequestsReceived || [],
    followRequestsSent: u.followRequestsSent || [],
    playlists: (u.playlists || []).map((p: any) => ({
      _id: idOf(p._id), name: p.name, items: p.items || [], createdAt: p.createdAt,
    })),
  };
}
