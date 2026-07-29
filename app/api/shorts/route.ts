import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ShortModel } from "@/models/Short";
import { SeriesModel } from "@/models/Series";
import { requireAdmin } from "@/lib/requireAdmin";
import { gradientFor } from "@/lib/gamification";
import { idOf, iso } from "@/lib/serialize";
import { ShortFeedItem } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/shorts?userId=&seriesId=&limit=
//
// A Short stores only a time range into an episode, so this joins the
// parent series to attach the audio URL and artwork the feed needs —
// one request per feed load rather than one per card.
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

    const series = await SeriesModel
      .find({ _id: { $in: [...new Set(shorts.map(s => s.seriesId))] } })
      .select("title coverImage episodes._id episodes.title episodes.audioUrl")
      .lean<any[]>();
    const byId = new Map(series.map(s => [idOf(s._id), s]));

    const feed: ShortFeedItem[] = [];
    for (const s of shorts) {
      const parent = byId.get(s.seriesId);
      if (!parent) continue;   // orphan — never ship a card that can't play

      const ep = (parent.episodes || []).find((e: any) => idOf(e._id) === s.episodeId);
      if (!ep?.audioUrl) continue;

      const likedBy: string[] = s.likedBy || [];
      const savedBy: string[] = s.savedBy || [];

      feed.push({
        _id: idOf(s._id),
        seriesId: s.seriesId, episodeId: s.episodeId,
        startSec: s.startSec ?? 0, endSec: s.endSec,
        caption: s.caption || "", hook: s.hook || "",
        creatorId: s.creatorId, creatorHandle: s.creatorHandle || "@swara",
        gradient: s.gradient || gradientFor(s.seriesId),
        likeCount: likedBy.length,
        commentCount: s.commentCount ?? 0,
        playCount: s.playCount ?? 0,
        createdAt: iso(s.createdAt),
        seriesTitle: parent.title, coverImage: parent.coverImage || "",
        audioUrl: ep.audioUrl, episodeTitle: ep.title || "",
        liked: !!userId && likedBy.includes(userId),
        saved: !!userId && savedBy.includes(userId),
      });
    }

    return NextResponse.json(feed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/shorts — admin only.
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const { seriesId, episodeId, startSec = 0, endSec } = body;

    if (!seriesId || !episodeId || typeof endSec !== "number") {
      return NextResponse.json({ error: "seriesId, episodeId and endSec are required" }, { status: 400 });
    }
    if (endSec <= startSec) {
      return NextResponse.json({ error: "endSec must be after startSec" }, { status: 400 });
    }

    // Validate the clip points at a real episode, or it would silently
    // never appear in the feed (GET skips orphans).
    const series = await SeriesModel.findById(seriesId).select("episodes._id").lean<any>();
    if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });
    if (!(series.episodes || []).some((e: any) => idOf(e._id) === episodeId)) {
      return NextResponse.json({ error: "Episode not in that series" }, { status: 404 });
    }

    const doc = await ShortModel.create({
      ...body, startSec,
      gradient: body.gradient || gradientFor(seriesId + episodeId),
    });
    return NextResponse.json({ _id: idOf(doc._id), ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
