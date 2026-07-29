import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ProgressModel } from "@/models/Progress";
import { SeriesModel } from "@/models/Series";
import { idOf } from "@/lib/serialize";
import { listeningDna } from "@/lib/gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// GET /api/users/[id]/dna — the Listening DNA bars on the profile.
//
// Weighted by seconds actually listened per genre, not by "number of
// series saved" — half-finishing ten thrillers shouldn't read the same
// as finishing one.
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;

    const progress = await ProgressModel.find({ userId: id }).lean<any[]>();
    if (!progress.length) return NextResponse.json({ dna: [], recent: [] });

    const series = await SeriesModel
      .find({ _id: { $in: [...new Set(progress.map(p => p.seriesId))] } })
      .select("title genre coverImage").lean<any[]>();
    const byId = new Map(series.map(s => [idOf(s._id), s]));

    const byGenre: Record<string, number> = {};
    for (const p of progress) {
      const s = byId.get(p.seriesId);
      if (!s?.genre) continue;
      byGenre[s.genre] = (byGenre[s.genre] ?? 0) + Math.max(0, p.position ?? 0);
    }

    // Recently played, newest first — the row of round covers.
    const recent = [...progress]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
      .map(p => {
        const s = byId.get(p.seriesId);
        return s ? { _id: p.seriesId, title: s.title, coverImage: s.coverImage || "" } : null;
      })
      .filter(Boolean);

    return NextResponse.json({ dna: listeningDna(byGenre), recent });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
