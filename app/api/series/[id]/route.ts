import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { requireAdmin } from "@/lib/requireAdmin";
import { requireUser } from "@/lib/requireUser";
import { processEpisodeTranscripts } from "@/lib/gemini";

export const maxDuration = 300;

type P = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const doc = await SeriesModel.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// Admins can edit any series. A non-admin can only edit a series they
// created (used for a creator adding an episode to their own show),
// and can't use that door to promote themselves onto isFeatured /
// isTrending or hand the series to a different account.
export async function PUT(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingDoc: any = await SeriesModel.findById(id)
      .select("episodes creatorId isFeatured isTrending").lean();
    if (!existingDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = !requireAdmin(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json();

    if (!isAdmin) {
      const auth = await requireUser(req);
      if (auth instanceof NextResponse) return auth;
      if (existingDoc.creatorId !== auth.userId) {
        return NextResponse.json({ error: "You don't own this series" }, { status: 403 });
      }
      body.creatorId = existingDoc.creatorId;
      body.isFeatured = existingDoc.isFeatured;
      body.isTrending = existingDoc.isTrending;
    }

    if (body.episodes) {
      body.episodes = await processEpisodeTranscripts(body.episodes, existingDoc.episodes || []);
      body.totalEpisodes = body.episodes.length;
    }
    const doc = await SeriesModel.findByIdAndUpdate(id, body, { new: true }).lean();
    return NextResponse.json(doc);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: P) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const { id } = await params;
    await SeriesModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
