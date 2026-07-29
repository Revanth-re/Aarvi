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
