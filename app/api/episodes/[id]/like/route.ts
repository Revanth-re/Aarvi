import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { EpisodeLikeModel } from "@/models/EpisodeLike";
import { UserModel } from "@/models/User";
import { notifyAndPush } from "@/lib/notify";

type P = { params: Promise<{ id: string }> };

// GET /api/episodes/[id]/like?userId=&seriesId= → { liked, likeCount }
// Initial state for the Player when an episode opens.
export async function GET(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id: episodeId } = await params;
    const userId = req.nextUrl.searchParams.get("userId") || "";
    const seriesId = req.nextUrl.searchParams.get("seriesId") || "";
    if (!seriesId) return NextResponse.json({ error: "seriesId is required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series = await SeriesModel.findById(seriesId).select("episodes._id episodes.likeCount").lean<any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ep = (series?.episodes || []).find((e: any) => e._id.toString() === episodeId);
    const likeCount = ep?.likeCount ?? 0;

    const liked = userId ? !!(await EpisodeLikeModel.exists({ episodeId, userId })) : false;
    return NextResponse.json({ liked, likeCount });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/episodes/[id]/like — Body: { userId, seriesId } → toggle.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id: episodeId } = await params;
    const { userId, seriesId } = await req.json();
    if (!userId || !seriesId) {
      return NextResponse.json({ error: "userId and seriesId are required" }, { status: 400 });
    }

    const existing = await EpisodeLikeModel.findOne({ episodeId, userId }).lean();
    if (existing) {
      await EpisodeLikeModel.deleteOne({ episodeId, userId });
    } else {
      // Race-safe: the unique (episodeId,userId) index rejects a
      // concurrent double-tap rather than double-counting it.
      await EpisodeLikeModel.create({ episodeId, userId, seriesId }).catch(() => {});
    }

    const likeCount = await EpisodeLikeModel.countDocuments({ episodeId });
    await SeriesModel.updateOne(
      { _id: seriesId, "episodes._id": episodeId },
      { $set: { "episodes.$.likeCount": likeCount } }
    );

    // Notify the creator on a new like only (never on unlike, never on
    // liking your own episode).
    if (!existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const series = await SeriesModel.findById(seriesId).select("title creatorId episodes._id episodes.title").lean<any>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const epTitle = (series?.episodes || []).find((e: any) => e._id.toString() === episodeId)?.title;
      if (series?.creatorId && series.creatorId !== userId) {
        const liker = await UserModel.findById(userId).select("name").lean<{ name?: string }>();
        await notifyAndPush(series.creatorId, {
          type: "episode_liked",
          category: "social",
          title: `${liker?.name || "Someone"} liked "${epTitle || "your episode"}"`,
          message: "",
          link: `/series/${seriesId}`,
          fromUserId: userId,
          fromUserName: liker?.name,
          toggle: "likes",
          pushUrl: `/series/${seriesId}`,
        });
      }
    }

    return NextResponse.json({ liked: !existing, likeCount });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
