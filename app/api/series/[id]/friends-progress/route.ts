import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { ProgressModel } from "@/models/Progress";

type P = { params: Promise<{ id: string }> };

// GET /api/series/[id]/friends-progress?viewerId=<userId>
// Returns progress for anyone `viewerId` follows who has listened to
// this series, so the series page can show "Maya is on Episode 3".
export async function GET(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id: seriesId } = await params;
    const viewerId = req.nextUrl.searchParams.get("viewerId");
    if (!viewerId) return NextResponse.json({ friends: [] });

    const viewer = await UserModel.findById(viewerId).lean();
    const following: string[] = viewer?.following || [];
    if (following.length === 0) return NextResponse.json({ friends: [] });

    const progressDocs = await ProgressModel.find({ userId: { $in: following }, seriesId }).lean();
    if (progressDocs.length === 0) return NextResponse.json({ friends: [] });

    const users = await UserModel.find({ _id: { $in: progressDocs.map(p => p.userId) } }).lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const friends = progressDocs.map(p => ({
      userId:    p.userId,
      name:      userMap[p.userId]?.name || "Listener",
      image:     userMap[p.userId]?.image || "",
      episodeId: p.episodeId,
      position:  p.position,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ friends });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
