import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Settings are stored per user so they follow the account across
// devices. The client keeps its own copy in zustand and writes here in
// the background, which is why a failed save must never lose the user's
// choice — the UI has already applied it locally.

// GET /api/settings?userId=
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const user = await UserModel.findById(userId).select("settings").lean<any>();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ settings: user.settings ?? {} });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/settings — { userId, settings: Partial<UserSettings> }
//
// Merged one level deep so the client can send just
// { playback: { skipIntro: false } } without wiping the sibling groups.
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const { userId, settings } = await req.json();
    if (!userId || !settings) {
      return NextResponse.json({ error: "userId and settings are required" }, { status: 400 });
    }

    const user = await UserModel.findById(userId);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const current = (user.settings ?? {}) as any;
    const merged: any = { ...(current.toObject ? current.toObject() : current) };

    for (const [k, v] of Object.entries(settings)) {
      merged[k] = (v && typeof v === "object" && !Array.isArray(v))
        ? { ...(merged[k] ?? {}), ...(v as object) }
        : v;
    }

    user.settings = merged;
    await user.save();

    return NextResponse.json({ ok: true, settings: user.settings });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
