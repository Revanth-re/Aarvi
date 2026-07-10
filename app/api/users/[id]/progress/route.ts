import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ProgressModel } from "@/models/Progress";

type P = { params: Promise<{ id: string }> };

// POST: upsert this user's playback position for a series.
// Body: { seriesId: string, episodeId?: string, position: number }
// Called periodically by the player while playing — cheap, idempotent.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { seriesId, episodeId, position } = await req.json();

    if (!seriesId || typeof position !== "number") {
      return NextResponse.json({ error: "seriesId and position are required" }, { status: 400 });
    }

    await ProgressModel.findOneAndUpdate(
      { userId: id, seriesId },
      { userId: id, seriesId, episodeId, position, updatedAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
