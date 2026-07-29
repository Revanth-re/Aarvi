import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { syncGamification, toGamification } from "@/lib/gamificationServer";
import { BADGES } from "@/lib/gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// GET /api/users/[id]/gamification
// Read-only snapshot: streak, coins, level, badges. Deliberately does
// not mutate anything, so the profile screen can poll it freely.
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;

    const user = await UserModel.findById(id).lean<any>();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      gamification: toGamification(user),
      catalog: BADGES,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/users/[id]/gamification — the listening heartbeat.
// Body: { seconds: number }
//
// Called by the player on a timer. Advances the streak on the first
// call of a new calendar day, adds listening time, and awards any
// badges the new totals unlock. Everything inside is idempotent per
// day, so a flaky connection retrying this is harmless.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const seconds = Number(body?.seconds ?? 0);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return NextResponse.json({ error: "seconds must be a positive number" }, { status: 400 });
    }

    const result = await syncGamification(id, { addSeconds: seconds });
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
