import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ThoughtModel } from "@/models/Thought";

type P = { params: Promise<{ id: string }> };

// POST /api/thoughts/[id]/like — toggle.
// Likes are a set of userIds, not a counter, so a double-tap or a
// retried request can't inflate the total.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const t = await ThoughtModel.findById(id);
    if (!t) return NextResponse.json({ error: "Thought not found" }, { status: 404 });

    const likedBy: string[] = t.likedBy || [];
    const had = likedBy.includes(userId);
    t.likedBy = had ? likedBy.filter((u: string) => u !== userId) : [...likedBy, userId];
    await t.save();

    return NextResponse.json({ liked: !had, likeCount: t.likedBy.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
