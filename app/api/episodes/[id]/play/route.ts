import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { EpisodePlayModel } from "@/models/EpisodePlay";

type P = { params: Promise<{ id: string }> };

// POST /api/episodes/[id]/play — Body: { seriesId, userId? }
//
// Counts a play — but only once ever per signed-in user per episode,
// not once per browser session. A client-side "have I already counted
// this" flag can't survive a page reload, so the real de-dup lives
// here: EpisodePlayModel's unique (episodeId, userId) index rejects a
// repeat play from the same user outright, and the counter only
// increments when the insert actually succeeds. Anonymous (logged-out)
// plays have no stable identity to de-dupe against, so those still
// count every time — same as most platforms' anonymous play counts.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id: episodeId } = await params;
    const { seriesId, userId } = await req.json();
    if (!seriesId) return NextResponse.json({ error: "seriesId is required" }, { status: 400 });

    if (userId) {
      try {
        await EpisodePlayModel.create({ userId, seriesId, episodeId });
      } catch {
        // Duplicate key — this user already has a recorded play for
        // this episode, so it doesn't count again.
        return NextResponse.json({ ok: true, counted: false });
      }
    }

    await SeriesModel.updateOne(
      { _id: seriesId, "episodes._id": episodeId },
      { $inc: { "episodes.$.playCount": 1, totalPlays: 1 } }
    );

    return NextResponse.json({ ok: true, counted: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
