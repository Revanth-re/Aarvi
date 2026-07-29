import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { UserModel } from "@/models/User";
import { gradientFor } from "@/lib/gamification";
import { DiscoverPayload, RisingCreator } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/discover?userId=<id>
//
// Everything the Discover screen needs in one round trip: trending
// hashtags, genre tiles with real counts, and rising creators.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId") || "";

    // ── Trending tags ──
    // Derived from the actual catalog rather than hardcoded, so the
    // chips stay meaningful as content changes.
    const tagAgg = await SeriesModel.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 }, plays: { $sum: "$totalPlays" } } },
      { $sort: { plays: -1, count: -1 } },
      { $limit: 8 },
    ]);

    const trendingTags = tagAgg
      .map((t: any) => String(t._id || "").trim())
      .filter(Boolean)
      // Render as hashtags: "true crime india" → "#TrueCrimeIndia"
      .map(t => "#" + t.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(""));

    // ── Genre tiles ──
    const genreAgg = await SeriesModel.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const genres = genreAgg
      .filter((g: any) => g._id)
      .map((g: any) => ({
        name: String(g._id),
        count: g.count,
        gradient: gradientFor(String(g._id)),
      }));

    // ── Rising creators ──
    // "Rising" = most-followed accounts. followerCount is computed by
    // counting who has this user in their `following` array, because
    // followers are never stored directly (see models/User.ts).
    const followerAgg = await UserModel.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: "$following" },
      { $group: { _id: "$following", followerCount: { $sum: 1 } } },
      { $sort: { followerCount: -1 } },
      { $limit: 12 },
    ]);

    let creators: RisingCreator[] = [];

    if (followerAgg.length) {
      const ids = followerAgg.map((f: any) => f._id);
      const docs = await UserModel.find({ _id: { $in: ids } })
        .select("name image").lean<any[]>();
      const countById = new Map(followerAgg.map((f: any) => [String(f._id), f.followerCount]));

      // Who the caller already follows, so the button renders the right
      // state without a second request per card.
      const me = userId ? await UserModel.findById(userId).select("following").lean<any>() : null;
      const following: string[] = me?.following ?? [];

      creators = docs
        .filter(d => d._id.toString() !== userId)  // don't suggest yourself
        .map(d => {
          const id = d._id.toString();
          const name = d.name || "Listener";
          return {
            _id: id,
            name,
            handle: "@" + name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, ""),
            image: d.image || "",
            followerCount: countById.get(id) ?? 0,
            isFollowing: following.includes(id),
          };
        })
        .sort((a, b) => b.followerCount - a.followerCount)
        .slice(0, 10);
    }

    const payload: DiscoverPayload = { trendingTags, genres, creators };
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
