import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ShortModel } from "@/models/Short";
import { UserModel } from "@/models/User";
import { notifyAndPush } from "@/lib/notify";

type P = { params: Promise<{ id: string }> };

// POST /api/shorts/[id]/like — toggle.
// Likes are stored as a set of userIds rather than a counter, so a
// double-tap or a retried request can't inflate the total.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const short = await ShortModel.findById(id);
    if (!short) return NextResponse.json({ error: "Short not found" }, { status: 404 });

    const likedBy: string[] = short.likedBy || [];
    const had = likedBy.includes(userId);
    short.likedBy = had ? likedBy.filter((u: string) => u !== userId) : [...likedBy, userId];
    await short.save();

    // Lifetime counter only ever goes up — un-liking shouldn't be able
    // to revoke progress the user already earned.
    if (!had) await UserModel.findByIdAndUpdate(userId, { $inc: { shortsLiked: 1 } });

    // Notify the creator on a new like only (never on unlike, never on
    // liking your own short).
    if (!had && short.creatorId && short.creatorId !== userId) {
      const liker = await UserModel.findById(userId).select("name").lean<{ name?: string }>();
      await notifyAndPush(short.creatorId, {
        type: "short_liked",
        category: "social",
        title: `${liker?.name || "Someone"} liked your short`,
        message: "",
        link: "/shorts",
        fromUserId: userId,
        fromUserName: liker?.name,
        toggle: "likes",
        pushUrl: "/shorts",
      });
    }

    return NextResponse.json({ liked: !had, likeCount: short.likedBy.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
