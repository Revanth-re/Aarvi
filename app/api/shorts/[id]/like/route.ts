import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ShortModel } from "@/models/Short";
import { UserModel } from "@/models/User";
import { syncGamification } from "@/lib/gamificationServer";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// POST /api/shorts/[id]/like — toggles this user's like.
// Body: { userId: string }
//
// The like set is stored as an array of userIds (not a counter), so
// this is idempotent per user: a double-tap or a retried request can
// never inflate the count.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const short = await ShortModel.findById(id);
    if (!short) return NextResponse.json({ error: "Short not found" }, { status: 404 });

    const likedBy: string[] = short.likedBy || [];
    const already = likedBy.includes(userId);

    short.likedBy = already ? likedBy.filter(u => u !== userId) : [...likedBy, userId];
    await short.save();

    // Keep the user's lifetime like counter in step — it's what the
    // "Shorts Fan" badge is computed from. Only counts up: un-liking
    // shouldn't be able to revoke a badge you've already earned.
    let newBadges: string[] = [];
    if (!already) {
      await UserModel.findByIdAndUpdate(userId, { $inc: { shortsLiked: 1 } });
      const res = await syncGamification(userId);
      newBadges = res?.newBadges ?? [];
    }

    return NextResponse.json({
      liked: !already,
      likeCount: short.likedBy.length,
      newBadges,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
