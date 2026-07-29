import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { recordListening } from "@/lib/gamificationServer";
import { levelFromSeconds } from "@/lib/gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// GET — read-only snapshot, safe to poll.
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const u = await UserModel.findById(id)
      .select("coins streak longestStreak listenSeconds favorites").lean<any>();
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lvl = levelFromSeconds(u.listenSeconds ?? 0);
    return NextResponse.json({
      coins: u.coins ?? 0,
      streak: u.streak ?? 0,
      longestStreak: u.longestStreak ?? 0,
      hours: lvl.hours,
      level: lvl.level,
      levelTitle: lvl.title,
      progress: lvl.progress,
      nextLevelHours: lvl.nextLevelHours,
      showCount: (u.favorites ?? []).length,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — the listening heartbeat. Idempotent per calendar day.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const seconds = Number(body?.seconds ?? 0);

    if (!Number.isFinite(seconds) || seconds < 0) {
      return NextResponse.json({ error: "seconds must be a positive number" }, { status: 400 });
    }

    const result = await recordListening(id, seconds);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
