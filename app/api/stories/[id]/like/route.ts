import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StoryModel } from "@/models/Story";
import { UserModel } from "@/models/User";
import { NotificationModel } from "@/models/Notification";

type P = { params: Promise<{ id: string }> };

// POST /api/stories/[id]/like — Body: { userId } — toggles the like.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const existing = await StoryModel.findById(id).select("likedBy userId").lean<{ likedBy?: string[]; userId?: string }>();
    if (!existing) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const alreadyLiked = (existing.likedBy || []).includes(userId);
    const doc = await StoryModel.findByIdAndUpdate(
      id,
      alreadyLiked ? { $pull: { likedBy: userId } } : { $addToSet: { likedBy: userId } },
      { new: true }
    ).lean<{ likedBy?: string[] }>();

    // Notify the story owner on a fresh like (never on unlike, never on
    // liking your own story) — a lightweight, no-push notification,
    // same weight as a new follower rather than a new message.
    if (!alreadyLiked && existing.userId && existing.userId !== userId) {
      const liker = await UserModel.findById(userId).select("name").lean<{ name?: string }>();
      await NotificationModel.create({
        userId: existing.userId,
        category: "social",
        type: "story_like",
        title: `${liker?.name || "Someone"} liked your story`,
        link: "/",
        fromUserId: userId,
        fromUserName: liker?.name,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, liked: !alreadyLiked, likeCount: (doc?.likedBy || []).length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
