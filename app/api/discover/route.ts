import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { UserModel } from "@/models/User";
import { idOf, publicUser } from "@/lib/serialize";
import { DiscoverPayload, VIBES } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/discover?userId=&vibe=&language=
//
// Powers the whole Discover screen in one request: the "Following"
// strip, creators to follow, and the vibe/language-filtered grid.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    const me = p.get("userId") || "";
    const vibe = p.get("vibe") || "";
    const language = p.get("language") || "";

    const meDoc = me
      ? await UserModel.findById(me).select("following favorites").lean<any>()
      : null;
    const following: string[] = meDoc?.following ?? [];

    // ── Matched for you ──
    const q: any = {};
    if (language && language !== "All") q.language = language;

    if (vibe) {
      const def = VIBES.find(v => v.key === vibe);
      if (def) {
        // Match the vibe key directly OR any of its keywords against
        // genre/tags, so a series works whether it was explicitly
        // tagged with the vibe or just happens to be the right genre.
        const rxs = def.match.map(m => new RegExp(m, "i"));
        q.$or = [{ vibes: vibe }, { genre: { $in: rxs } }, { tags: { $in: rxs } }];
      }
    }

    const matched = await SeriesModel.find(q)
      .select("-episodes.transcript -episodes.transcriptSegments")
      .sort({ isTrending: -1, totalPlays: -1 })
      .limit(12).lean<any[]>();

    // ── Following: newest episode from each creator you follow ──
    let followingRows: DiscoverPayload["following"] = [];
    if (following.length) {
      const creators = await UserModel.find({ _id: { $in: following } })
        .select("name handle image").lean<any[]>();
      const creatorById = new Map(creators.map(c => [idOf(c._id), c]));

      const theirSeries = await SeriesModel.find({ creatorId: { $in: following } })
        .select("-episodes.transcript -episodes.transcriptSegments")
        .sort({ updatedAt: -1 }).limit(6).lean<any[]>();

      followingRows = theirSeries.map(s => {
        const eps = s.episodes || [];
        return {
          series: { ...s, _id: idOf(s._id) } as any,
          // Highest episode number, not last in the array — episodes
          // can be edited and reordered.
          latestEpisode: eps.length
            ? [...eps].sort((a: any, b: any) => b.episodeNumber - a.episodeNumber)[0]
            : undefined,
          creatorName: creatorById.get(s.creatorId)?.name || "Creator",
        };
      });
    }

    // ── Creators to follow ──
    // Ranked by follower count, which is derived (nobody stores a
    // followers array — see models/User.ts).
    const followerAgg = await UserModel.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: "$following" },
      { $group: { _id: "$following", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 20 },
    ]);
    const countById = new Map(followerAgg.map((f: any) => [String(f._id), f.n]));

    // Include flagged creator accounts even with zero followers, so a
    // fresh install doesn't show an empty row.
    const creatorDocs = await UserModel.find({
      $or: [
        { _id: { $in: followerAgg.map((f: any) => f._id) } },
        { isCreator: true },
      ],
    }).select("name handle image isCreator").limit(20).lean<any[]>();

    const creators = creatorDocs
      .filter(u => idOf(u._id) !== me)
      .map(u => {
        const id = idOf(u._id);
        const pu = publicUser(u);
        return {
          _id: id, name: pu.name, handle: pu.handle, image: pu.image,
          followerCount: countById.get(id) ?? 0,
          isFollowing: following.includes(id),
        };
      })
      .sort((a, b) => b.followerCount - a.followerCount)
      .slice(0, 12);

    const payload: DiscoverPayload = {
      following: followingRows,
      creators,
      matched: matched.map(s => ({ ...s, _id: idOf(s._id) })) as any,
    };
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
