import bcrypt from "bcryptjs";

// bcryptjs (pure JS, no native compile step) rather than bcrypt —
// avoids native-binding build issues on serverless hosts like Vercel.
const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string | undefined | null): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}
