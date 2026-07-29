import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

// Call at the top of any mutating API route that any logged-in user —
// not just admins — should be able to hit: creator uploads, posting a
// series/episode/short they own, etc. Trusts the client-supplied
// x-user-id header, same trust model the rest of this app already uses
// for userId in request bodies, but it does at least check the id
// resolves to a real account so an empty/garbage id can't sneak through.
//
// Returns `{ userId }` on success, or a ready-to-return 401
// NextResponse on failure — callers do:
//
//   const auth = await requireUser(req);
//   if (auth instanceof NextResponse) return auth;
//   const { userId } = auth;
export async function requireUser(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Log in to do that" }, { status: 401 });
  }
  await connectDB();
  const exists = await UserModel.exists({ _id: userId });
  if (!exists) {
    return NextResponse.json({ error: "Account not found" }, { status: 401 });
  }
  return { userId };
}
