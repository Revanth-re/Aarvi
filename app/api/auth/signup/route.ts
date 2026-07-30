import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { handleFrom } from "@/lib/gamification";
import { hashPassword } from "@/lib/password";
import { sessionUser } from "@/lib/serialize";

// POST /api/auth/signup — { name, username, mobile, password }
//
// Alongside Google OAuth, not replacing it: this is the username/mobile
// + password path. Passwords are hashed server-side before anything
// touches the database — the client never sees or sends a hash.
export async function POST(req: NextRequest) {
  try {
    const { name, username, mobile, password } = await req.json();

    const cleanName = String(name ?? "").trim().slice(0, 50);
    const cleanMobile = String(mobile ?? "").replace(/[^\d+]/g, "");
    const cleanPassword = String(password ?? "");

    if (!cleanName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!username || !String(username).trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (cleanMobile.replace(/^\+/, "").length < 7) {
      return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
    }
    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const handle = handleFrom(String(username));

    await connectDB();

    const [handleTaken, mobileTaken] = await Promise.all([
      UserModel.findOne({ handle }).select("_id").lean(),
      UserModel.findOne({ mobile: cleanMobile }).select("_id").lean(),
    ]);
    if (handleTaken) return NextResponse.json({ error: `@${handle} is already taken` }, { status: 409 });
    if (mobileTaken) return NextResponse.json({ error: "That mobile number is already registered" }, { status: 409 });

    const passwordHash = await hashPassword(cleanPassword);

    const user = await UserModel.create({
      name: cleanName,
      handle,
      mobile: cleanMobile,
      password: passwordHash,
    });

    return NextResponse.json({ user: sessionUser(user) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
