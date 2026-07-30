// Turns a raw MongoDB/Mongoose error into something safe and useful to
// show a user, instead of leaking a driver error string like
// `MongoServerError: E11000 duplicate key error collection: ...` into
// the UI (which is confusing and exposes internal schema details).
//
// The most common case by far is E11000 (duplicate key) on a
// sparse-unique field — handle, mobile, email, googleId. Each gets a
// specific, actionable message; anything else falls back to a generic
// "try again" so the raw driver text never reaches the client.
export function friendlyDbError(e: unknown): { message: string; status: number } {
  const err = e as { code?: number; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> };

  if (err?.code === 11000) {
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : undefined;
    switch (field) {
      case "handle":
        return { message: "That username is already taken.", status: 409 };
      case "mobile":
        return { message: "That mobile number is already registered.", status: 409 };
      case "email":
        return { message: "That email is already registered.", status: 409 };
      case "googleId":
        // Should no longer happen now that this index is sparse (see
        // lib/mongodb.ts's syncIndexes call) — kept as a safety net in
        // case an old index hasn't been reconciled yet on this database.
        return { message: "Couldn't create your account — please try again in a moment.", status: 500 };
      default:
        return { message: "That account already exists.", status: 409 };
    }
  }

  return { message: "Something went wrong. Please try again.", status: 500 };
}
