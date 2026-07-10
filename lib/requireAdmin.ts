import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "./admin";

// Call at the top of any mutating API route handler (POST/PUT/DELETE).
// Returns a 403 NextResponse if the request isn't from an allow-listed
// admin email, or null if it's OK to proceed.
export function requireAdmin(request: NextRequest): NextResponse | null {
  const email = request.headers.get("x-user-email");
  if (!isAdminEmail(email)) {
    return NextResponse.json(
      { error: "Forbidden: admin access required" },
      { status: 403 }
    );
  }
  return null;
}
