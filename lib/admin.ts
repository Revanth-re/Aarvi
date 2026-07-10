// Simple email allow-list for admin access.
// NOTE: this is a lightweight check, not a cryptographic session. The client
// sends the logged-in user's email in the `x-user-email` header, and the
// server checks it against this list before allowing writes. Anyone who can
// read/replay network requests could forge this header, so don't put
// anything highly sensitive behind this — it's meant to stop casual/accidental
// misuse, not a determined attacker. For real security this should be
// replaced with a signed session cookie.

const RAW = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "claude@adrefresh.com";

export const ADMIN_EMAILS = RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
