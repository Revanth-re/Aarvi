import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { requireAdmin } from "@/lib/requireAdmin";
import { transcribeAudioWithGemini } from "@/lib/gemini";

export const maxDuration = 300;

// POST: manually (re)generate the timestamped transcript for one
// episode. Exists as a fallback for when auto-generation on save fails
// or times out (e.g. a long episode on a shorter serverless timeout) —
// lets an admin retry just that one episode without re-saving the
// whole series. Body: { seriesId, episodeId }
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const { seriesId, episodeId } = await req.json();
    if (!seriesId || !episodeId) {
      return NextResponse.json({ error: "seriesId and episodeId are required" }, { status: 400 });
    }

    const series = await SeriesModel.findById(seriesId);
    if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ep = (series.episodes as any).id(episodeId);
    if (!ep) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    if (!ep.audioUrl) return NextResponse.json({ error: "This episode has no audio file yet" }, { status: 400 });

    ep.transcriptStatus = "pending";
    await series.save();

    try {
      const segments = await transcribeAudioWithGemini(ep.audioUrl);
      ep.transcriptSegments = segments;
      ep.transcriptStatus = segments.length > 0 ? "ready" : "failed";
      await series.save();
      return NextResponse.json({ transcriptStatus: ep.transcriptStatus, transcriptSegments: ep.transcriptSegments });
    } catch (e) {
      ep.transcriptStatus = "failed";
      await series.save();
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
