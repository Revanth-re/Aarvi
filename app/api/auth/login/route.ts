import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { handleFrom } from "@/lib/gamification";
import { verifyPassword } from "@/lib/password";
import { sessionUser } from "@/lib/serialize";
import { friendlyDbError } from "@/lib/mongoError";

// POST /api/auth/login — { identifier, password }
// `identifier` is a username or a mobile number — whichever it looks
// like, try both so the user doesn't have to specify which.
export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();
    const id = String(identifier ?? "").trim();
    const pw = String(password ?? "");

    if (!id || !pw) {
      return NextResponse.json({ error: "Enter your username/mobile and password" }, { status: 400 });
    }

    await connectDB();

    const asMobile = id.replace(/[^\d+]/g, "");
    const asHandle = handleFrom(id);

    // select("+password") — the schema marks it select:false so it
    // never leaks through the normal user-fetch routes; this is the
    // one place it needs to come back, to verify against.
    const user = await UserModel.findOne({
      $or: [{ handle: asHandle }, ...(asMobile ? [{ mobile: asMobile }] : [])],
    }).select("+password");

    if (!user) {
      return NextResponse.json({ error: "No account found with that username or mobile number" }, { status: 401 });
    }
    if (!user.password) {
      return NextResponse.json({ error: "This account uses Google sign-in — use \"Continue with Google\" instead" }, { status: 401 });
    }

    const ok = await verifyPassword(pw, user.password);
    if (!ok) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    return NextResponse.json({ user: sessionUser(user) });
  } catch (e) {
    const { message, status } = friendlyDbError(e);
    return NextResponse.json({ error: message }, { status });
  }
}
