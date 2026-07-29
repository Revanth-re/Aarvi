import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ShortModel } from "@/models/Short";
import { SeriesModel } from "@/models/Series";
import { requireAdmin } from "@/lib/requireAdmin";
import { gradientFor } from "@/lib/gamification";
import { ShortFeedItem } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/shorts?limit=20&userId=<id>&seriesId=<id>
//
// Returns the vertical reel feed. Each Short stores only a time range
// into an episode, so this route joins the parent series to attach the
// audio URL, cover art and titles the feed needs — one request per
// feed load instead of one per card.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(p.get("limit") || "20"), 50);
    const userId = p.get("userId") || "";
    const seriesId = p.get("seriesId");

    const q: any = {};
    if (seriesId) q.seriesId = seriesId;

    const shorts = await ShortModel.find(q).sort({ createdAt: -1 }).limit(limit).lean<any[]>();
    if (!shorts.length) return NextResponse.json([]);

    // Single batched lookup for every series referenced by this page of
    // shorts, rather than one query per short.
    const seriesIds = [...new Set(shorts.map(s => s.seriesId))];
    const seriesDocs = await SeriesModel.find({ _id: { $in: seriesIds } })
      .select("title coverImage genre episodes._id episodes.title episodes.audioUrl")
      .lean<any[]>();

    const byId = new Map(seriesDocs.map(s => [s._id.toString(), s]));

    const feed: ShortFeedItem[] = [];
    for (const s of shorts) {
      const series = byId.get(s.seriesId);
      // Skip orphans rather than shipping a card that can't play —
      // happens if a series was deleted but its clips weren't.
      if (!series) continue;

      const ep = (series.episodes || []).find(
        (e: any) => e._id.toString() === s.episodeId
      );
      if (!ep?.audioUrl) continue;

      const likedBy: string[] = s.likedBy || [];

      feed.push({
        _id: s._id.toString(),
        seriesId: s.seriesId,
        episodeId: s.episodeId,
        startSec: s.startSec ?? 0,
        endSec: s.endSec,
        caption: s.caption || "",
        creatorId: s.creatorId,
        creatorHandle: s.creatorHandle || "@swara",
        gradient: s.gradient || gradientFor(s.seriesId),
        likeCount: likedBy.length,
        commentCount: s.commentCount ?? 0,
        playCount: s.playCount ?? 0,
        createdAt: s.createdAt,
        seriesTitle: series.title,
        coverImage: series.coverImage || "",
        audioUrl: ep.audioUrl,
        episodeTitle: ep.title || "",
        liked: !!userId && likedBy.includes(userId),
      });
    }

    return NextResponse.json(feed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/shorts — admin only. Creates a clip from an existing episode.
// Body: { seriesId, episodeId, startSec, endSec, caption, creatorHandle? }
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const { seriesId, episodeId, startSec = 0, endSec } = body;

    if (!seriesId || !episodeId || typeof endSec !== "number") {
      return NextResponse.json(
        { error: "seriesId, episodeId and endSec are required" }, { status: 400 }
      );
    }
    if (endSec <= startSec) {
      return NextResponse.json({ error: "endSec must be after startSec" }, { status: 400 });
    }

    // Validate the clip actually points at a real episode — otherwise
    // it would silently vanish from the feed (GET skips orphans).
    const series = await SeriesModel.findById(seriesId).select("episodes._id").lean<any>();
    if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

    const exists = (series.episodes || []).some((e: any) => e._id.toString() === episodeId);
    if (!exists) return NextResponse.json({ error: "Episode not in that series" }, { status: 404 });

    const doc = await ShortModel.create({
      ...body,
      startSec,
      gradient: body.gradient || gradientFor(seriesId + episodeId),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
