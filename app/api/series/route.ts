import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { UserModel } from "@/models/User";
import { NotificationModel } from "@/models/Notification";
import { requireAdmin } from "@/lib/requireAdmin";
import { requireUser } from "@/lib/requireUser";
import { processEpisodeTranscripts } from "@/lib/gemini";
import { sendPushToUser } from "@/lib/push";
import { idOf } from "@/lib/serialize";
import { VIBES } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Tells everyone who follows this creator that they just published —
// same weight as a new follower notification (in-app always, push if
// that device has it enabled). Never blocks or fails the publish
// itself if something here goes wrong; it's a nice-to-have on top of
// a successful series creation, not a precondition for one.
async function notifyFollowersOfNewSeries(creatorId: string, seriesId: string, title: string) {
  try {
    const [author, followers] = await Promise.all([
      UserModel.findById(creatorId).select("name").lean<any>(),
      UserModel.find({ following: creatorId }).select("_id settings").lean<any[]>(),
    ]);
    if (!followers.length) return;

    const authorName = author?.name || "Someone you follow";
    await NotificationModel.insertMany(followers.map(f => ({
      userId: idOf(f._id),
      category: "drops",
      type: "new_series",
      title: `${authorName} published a new series`,
      message: title,
      link: `/series/${seriesId}`,
      fromUserId: creatorId,
      fromUserName: authorName,
    })));

    await Promise.all(followers.map(f =>
      f.settings?.notif?.newMessages !== false
        ? sendPushToUser(idOf(f._id), { title: authorName, body: `New series: ${title}`, url: `/series/${seriesId}` })
        : Promise.resolve()
    ));
  } catch {
    // Best-effort — see comment above.
  }
}

// Give transcript generation (Gemini upload + processing) room to run
// before the platform's default serverless timeout kicks in. Actual
// ceiling still depends on your hosting plan.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    const q: any = {};
    if (p.get("genre") && p.get("genre") !== "All") q.genre = p.get("genre");
    if (p.get("featured") === "true") q.isFeatured = true;
    if (p.get("trending") === "true") q.isTrending = true;
    if (p.get("language") && p.get("language") !== "All") q.language = p.get("language");
    // Creator Studio lists only what this account published.
    if (p.get("creatorId")) q.creatorId = p.get("creatorId");
    if (p.get("search")) {
      const rx = new RegExp(p.get("search")!, "i");
      q.$or = [{ title: rx }, { description: rx }, { tags: { $in: [rx] } }];
    }

    // Vibe filter (Discover's "tell us the vibe" picker). A vibe maps
    // to a handful of keywords matched against BOTH genre and tags, so
    // it works whether a show was tagged explicitly or just happens to
    // be the right genre.
    const vibe = p.get("vibe");
    if (vibe) {
      const def = VIBES.find(v => v.key === vibe);
      if (def) {
        const rxs = def.match.map((m: string) => new RegExp(m, "i"));
        const vibeOr = [{ vibes: vibe }, { genre: { $in: rxs } }, { tags: { $in: rxs } }];
        // Combined with $and so a vibe + search request doesn't have one
        // $or silently overwrite the other.
        if (q.$or) { q.$and = [{ $or: q.$or }, { $or: vibeOr }]; delete q.$or; }
        else q.$or = vibeOr;
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

// Admins can create house/curated content with any flags they like.
// Anyone else can still publish here — a creator posting their own
// series, Instagram-style — but the server pins creatorId to their own
// account and forces isFeatured/isTrending off, so a regular user can't
// self-promote onto the curated rails.
export async function POST(req: NextRequest) {
  const isAdmin = !requireAdmin(req);
  let creatorId: string | null = null;
  if (!isAdmin) {
    const auth = await requireUser(req);
    if (auth instanceof NextResponse) return auth;
    creatorId = auth.userId;
  }
  try {
    await connectDB();
    const body = await req.json();
    const episodes = body.episodes?.length ? await processEpisodeTranscripts(body.episodes) : (body.episodes || []);
    const doc = await SeriesModel.create({
      ...body,
      episodes, totalEpisodes: episodes.length,
      ...(creatorId ? { creatorId, isFeatured: false, isTrending: false } : {}),
    });

    // Only a real creator publishing their own show notifies their
    // followers — admin-seeded/house content has no "creator" a
    // follow relationship makes sense for. Awaited (not fire-and-forget)
    // because a serverless function can get torn down right after the
    // response is sent, which would silently kill a detached async call
    // before it finishes — see the identical note in app/api/messages.
    if (creatorId) {
      await notifyFollowersOfNewSeries(creatorId, idOf(doc._id), doc.title);
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
