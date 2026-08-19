import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";

type P = { params: Promise<{ id: string }> };

// POST /api/episodes/[id]/play — Body: { seriesId }
//
// Counts a play. Fired once per episode per app session (see the
// played-ref guard in components/shell/Player.tsx) when playback
// actually starts — not on every pause/resume toggle, and not just on
// opening the episode. No auth: an anonymous listen still counts,
// same as almost every platform's play counter.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id: episodeId } = await params;
    const { seriesId } = await req.json();
    if (!seriesId) return NextResponse.json({ error: "seriesId is required" }, { status: 400 });

    await SeriesModel.updateOne(
      { _id: seriesId, "episodes._id": episodeId },
      { $inc: { "episodes.$.playCount": 1, totalPlays: 1 } }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
