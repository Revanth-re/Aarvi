import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { requireAdmin } from "@/lib/requireAdmin";
import { processEpisodeTranscripts } from "@/lib/gemini";
import { MOOD_BY_KEY } from "@/lib/gamification";

// Give transcript generation (Gemini upload + processing) room to run
// before the platform's default serverless timeout kicks in. Actual
// ceiling still depends on your hosting plan.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {};
    if (p.get("genre") && p.get("genre") !== "All") q.genre = p.get("genre");
    if (p.get("featured") === "true") q.isFeatured = true;
    if (p.get("trending") === "true") q.isTrending = true;
    if (p.get("search")) {
      const rx = new RegExp(p.get("search")!, "i");
      q.$or = [{ title: rx }, { description: rx }, { tags: { $in: [rx] } }];
    }

    // Mood filter (home screen's "What's your mood tonight?"). A mood
    // maps to a handful of keywords which are matched against BOTH the
    // genre and the tags, so it works whether a show was filed under
    // the Horror genre or merely tagged "horror".
    const mood = p.get("mood");
    if (mood && mood !== "all") {
      const def = MOOD_BY_KEY[mood];
      if (def) {
        const rxs = def.match.map(m => new RegExp(m, "i"));
        const moodOr = [{ genre: { $in: rxs } }, { tags: { $in: rxs } }];
        // Combine with $and so a mood + search request doesn't have one
        // $or silently overwrite the other.
        if (q.$or) { q.$and = [{ $or: q.$or }, { $or: moodOr }]; delete q.$or; }
        else q.$or = moodOr;
      }
    }

    // Recently added, for the home screen's "Fresh drops this week".
    if (p.get("sort") === "new") {
      const data = await SeriesModel.find(q)
        .select("-episodes.transcript")
        .sort({ createdAt: -1 })
        .limit(parseInt(p.get("limit") || "50"))
        .lean();
      return NextResponse.json(data);
    }

    const limit = parseInt(p.get("limit") || "50");
    const data = await SeriesModel.find(q).select("-episodes.transcript").limit(limit).lean();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const body = await req.json();
    const episodes = body.episodes?.length ? await processEpisodeTranscripts(body.episodes) : (body.episodes || []);
    const doc = await SeriesModel.create({ ...body, episodes, totalEpisodes: episodes.length });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
