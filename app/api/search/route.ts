import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { UserModel } from "@/models/User";
import { ThoughtModel } from "@/models/Thought";
import { idOf, iso, publicUser } from "@/lib/serialize";
import { SearchPayload, Thought } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Regex-escape user input before building a RegExp. Without this, a
// query containing "(" or "*" throws and the whole search 500s.
function safeRx(q: string) {
  return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

// GET /api/search?q=&userId=
//
// Searches series, creators and thoughts in one round trip — the search
// screen shows all three, and three separate requests would make the
// results pop in at different times.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    const q = (p.get("q") || "").trim();
    const me = p.get("userId") || "";

    // Trending chips come from the catalog's most-played tags rather
    // than a hardcoded list, so they stay meaningful as content changes.
    const trendingAgg = await SeriesModel.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", plays: { $sum: "$totalPlays" } } },
      { $sort: { plays: -1 } },
      { $limit: 6 },
    ]);
    const trending = trendingAgg.map((t: any) => String(t._id)).filter(Boolean);

    if (!q) {
      const empty: SearchPayload = { series: [], creators: [], thoughts: [], trending };
      return NextResponse.json(empty);
    }

    const rx = safeRx(q);

    const series = await SeriesModel.find({
      isDraft: { $ne: true },
      $or: [{ title: rx }, { description: rx }, { tags: rx }, { genre: rx }, { narrator: rx }],
    }).select("-episodes.transcript -episodes.transcriptSegments").limit(20).lean<any[]>();

    const creatorDocs = await UserModel.find({
      $or: [{ name: rx }, { handle: rx }],
    }).select("name handle image").limit(10).lean<any[]>();

    const meDoc = me ? await UserModel.findById(me).select("following").lean<any>() : null;
    const following: string[] = meDoc?.following ?? [];

    const creators = await Promise.all(creatorDocs.map(async (u) => {
      const id = idOf(u._id);
      const pu = publicUser(u);
      return {
        _id: id, name: pu.name, handle: pu.handle, image: pu.image,
        followerCount: await UserModel.countDocuments({ following: id }),
        isFollowing: following.includes(id),
      };
    }));

    // Thought search — the "💬 thoughts" part of the placeholder.
    const rawThoughts = await ThoughtModel.find({ text: rx, isPublic: true })
      .sort({ createdAt: -1 }).limit(12).lean<any[]>();

    const tUsers = await UserModel
      .find({ _id: { $in: [...new Set(rawThoughts.map(t => t.userId))] } })
      .select("name handle image").lean<any[]>();
    const tUserById = new Map(tUsers.map(u => [idOf(u._id), u]));

    const tSeries = await SeriesModel
      .find({ _id: { $in: [...new Set(rawThoughts.map(t => t.seriesId))] } })
      .select("title episodes._id episodes.episodeNumber").lean<any[]>();
    const tSeriesById = new Map(tSeries.map(s => [idOf(s._id), s]));

    const thoughts: Thought[] = [];
    for (const t of rawThoughts) {
      const u = tUserById.get(t.userId);
      const s = tSeriesById.get(t.seriesId);
      if (!u || !s) continue;
      const ep = (s.episodes || []).find((e: any) => idOf(e._id) === t.episodeId);
      const pu = publicUser(u);
      const likedBy: string[] = t.likedBy || [];
      thoughts.push({
        _id: idOf(t._id),
        userId: t.userId, userName: pu.name, userHandle: pu.handle, userImage: pu.image,
        seriesId: t.seriesId, seriesTitle: s.title,
        episodeId: t.episodeId, episodeNumber: ep?.episodeNumber ?? 0,
        atSec: t.atSec ?? 0, text: t.text,
        likeCount: likedBy.length, liked: !!me && likedBy.includes(me),
        replyCount: t.replyCount ?? 0, parentId: null,
        createdAt: iso(t.createdAt),
      });
    }

    const payload: SearchPayload = {
      series: series.map(s => ({ ...s, _id: idOf(s._id) })) as any,
      creators, thoughts, trending,
    };
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
