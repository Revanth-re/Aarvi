import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { requireAdmin } from "@/lib/requireAdmin";
import { requireUser } from "@/lib/requireUser";

type P = { params: Promise<{ id: string; episodeId: string }> };

// PATCH /api/series/[id]/episodes/[episodeId] — { isDraft?: boolean }
//
// A one-tap "publish this episode" / "move back to draft" action from
// Creator Studio, separate from the full series PUT so flipping one
// flag doesn't re-run transcript generation for every episode on the
// series (see processEpisodeTranscripts in lib/gemini.ts, which the
// full PUT triggers whenever `episodes` is present in the body).
export async function PATCH(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id, episodeId } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json();

    const series = await SeriesModel.findById(id);
    if (!series) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = !requireAdmin(req);
    if (!isAdmin) {
      const auth = await requireUser(req);
      if (auth instanceof NextResponse) return auth;
      if (series.creatorId !== auth.userId) {
        return NextResponse.json({ error: "You don't own this series" }, { status: 403 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ep = (series.episodes as any).id(episodeId);
    if (!ep) return NextResponse.json({ error: "Episode not found" }, { status: 404 });

    if (typeof body.isDraft === "boolean") ep.isDraft = body.isDraft;
    if (typeof body.isLocked === "boolean") ep.isLocked = body.isLocked;

    series.totalEpisodes = series.episodes.length;
    await series.save();

    return NextResponse.json({ ok: true, episode: ep.toObject() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
