import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { UserModel } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";
import { requireUser } from "@/lib/requireUser";
import { processEpisodeTranscripts } from "@/lib/gemini";
import { avgEpisodeMinutes } from "@/lib/gamification";

export const maxDuration = 300;

type P = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = await SeriesModel.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = !requireAdmin(_);
    const requesterId = _.headers.get("x-user-id");
    const isOwner = !!requesterId && requesterId === doc.creatorId;

    // A draft series doesn't exist as far as anyone but its creator
    // (or an admin) is concerned — 404 rather than 403 so it doesn't
    // even confirm the id is real.
    if (doc.isDraft && !isAdmin && !isOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (isAdmin || isOwner) return NextResponse.json(doc);

    // Follower-only episodes need to know if this requester actually
    // follows the creator — one extra lookup, only for non-owners.
    let followsCreator = false;
    if (requesterId && doc.creatorId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requester = await UserModel.findById(requesterId).select("following").lean<any>();
      followsCreator = !!requester?.following?.includes(doc.creatorId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const episodes = (doc.episodes || []).filter((e: any) => {
      if (e.isDraft || e.takedownActioned) return false;
      if (e.visibility === "private") return false;
      if (e.visibility === "followers") return followsCreator;
      return true; // "public" or unset (legacy default)
    });
    return NextResponse.json({ ...doc, episodes, totalEpisodes: episodes.length });
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
      body.avgMinutes = avgEpisodeMinutes(body.episodes);
    }
    const doc = await SeriesModel.findByIdAndUpdate(id, body, { new: true }).lean();
    return NextResponse.json(doc);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const existingDoc = await SeriesModel.findById(id).select("creatorId").lean<{ creatorId?: string }>();
    if (!existingDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = !requireAdmin(req);
    if (!isAdmin) {
      const auth = await requireUser(req);
      if (auth instanceof NextResponse) return auth;
      if (existingDoc.creatorId !== auth.userId) {
        return NextResponse.json({ error: "You don't own this series" }, { status: 403 });
      }
    }

    await SeriesModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
