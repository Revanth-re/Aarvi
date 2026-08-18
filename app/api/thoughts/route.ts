import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ThoughtModel } from "@/models/Thought";
import { UserModel } from "@/models/User";
import { SeriesModel } from "@/models/Series";
import { notifyAndPush } from "@/lib/notify";
import { idOf, iso, publicUser } from "@/lib/serialize";
import { Thought } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Join thoughts with their author and series in two batched queries
// rather than denormalising names onto every row — a rename or new
// avatar then updates everywhere instead of leaving stale copies.
async function hydrate(rows: any[], me: string): Promise<Thought[]> {
  if (!rows.length) return [];

  const users = await UserModel
    .find({ _id: { $in: [...new Set(rows.map(r => r.userId))] } })
    .select("name handle image").lean<any[]>();
  const userById = new Map(users.map(u => [idOf(u._id), u]));

  const series = await SeriesModel
    .find({ _id: { $in: [...new Set(rows.map(r => r.seriesId))] } })
    .select("title episodes._id episodes.episodeNumber").lean<any[]>();
  const seriesById = new Map(series.map(s => [idOf(s._id), s]));

  const out: Thought[] = [];
  for (const r of rows) {
    const u = userById.get(r.userId);
    const s = seriesById.get(r.seriesId);
    if (!u || !s) continue;   // orphaned by a deletion — skip

    const ep = (s.episodes || []).find((e: any) => idOf(e._id) === r.episodeId);
    const pu = publicUser(u);
    const likedBy: string[] = r.likedBy || [];

    out.push({
      _id: idOf(r._id),
      userId: r.userId, userName: pu.name, userHandle: pu.handle, userImage: pu.image,
      seriesId: r.seriesId, seriesTitle: s.title,
      episodeId: r.episodeId, episodeNumber: ep?.episodeNumber ?? 0,
      atSec: r.atSec ?? 0,
      text: r.text,
      likeCount: likedBy.length,
      liked: !!me && likedBy.includes(me),
      replyCount: r.replyCount ?? 0,
      parentId: r.parentId ?? null,
      createdAt: iso(r.createdAt),
    });
  }
  return out;
}

// GET /api/thoughts?userId=&episodeId=&seriesId=&authorId=&parentId=&limit=
//
// One endpoint serves five surfaces: an episode's margin notes, a
// profile's own thoughts, Library → Thoughts, Series → Thoughts, and —
// with ?parentId= — the replies under one specific thought.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    const me = p.get("userId") || "";
    const limit = Math.min(parseInt(p.get("limit") || "20"), 60);

    // Default is top-level thoughts only (parentId: null); passing
    // ?parentId=<id> switches to fetching that thought's own replies.
    const q: any = p.get("parentId") ? { parentId: p.get("parentId") } : { parentId: null };
    if (p.get("episodeId")) q.episodeId = p.get("episodeId");
    if (p.get("seriesId"))  q.seriesId  = p.get("seriesId");

    // Never surface anything an admin has moderated away here — the
    // (admin-only) moderation log is the one place that still can.
    q.hiddenByModeration = { $ne: true };

    let followingIds: string[] = [];
    if (me) {
      const meDoc = await UserModel.findById(me).select("following").lean<any>();
      followingIds = meDoc?.following ?? [];
    }

    if (p.get("authorId")) {
      q.userId = p.get("authorId");
      if (p.get("authorId") !== me) {
        // Your own private thoughts are visible to you; nobody else's
        // are. "followers"-tier ones need the viewer to actually
        // follow this author.
        const followsAuthor = followingIds.includes(p.get("authorId")!);
        q.$or = [
          { visibility: followsAuthor ? { $ne: "private" } : "public" },
          { visibility: { $exists: false }, isPublic: true }, // legacy rows predating the visibility field
        ];
      }
    } else {
      // Mixed-author feed (an episode, a series, or the global list):
      // public to everyone, "followers"-tier only from people you
      // follow, always your own, plus legacy rows.
      q.$or = [
        { visibility: "public" },
        { visibility: "followers", userId: { $in: [...followingIds, me].filter(Boolean) } },
        ...(me ? [{ userId: me }] : []),
        { visibility: { $exists: false }, isPublic: true },
      ];
    }

    // A reply thread reads chronologically, oldest first. Inside an
    // episode (no parentId), order by position in the audio. Everywhere
    // else, newest first.
    const sort: any = p.get("parentId") ? { createdAt: 1 }
      : p.get("episodeId") ? { atSec: 1 }
      : { createdAt: -1 };

    const rows = await ThoughtModel.find(q).sort(sort).limit(limit).lean<any[]>();
    return NextResponse.json(await hydrate(rows, me));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/thoughts — leave a thought at a moment.
// Body: { userId, seriesId, episodeId, atSec, text, parentId?, visibility? }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, seriesId, episodeId, atSec, text, parentId = null, visibility } = await req.json();

    if (!userId || !seriesId || !episodeId || typeof atSec !== "number") {
      return NextResponse.json(
        { error: "userId, seriesId, episodeId and atSec are required" }, { status: 400 }
      );
    }
    const body = String(text ?? "").trim();
    if (!body) return NextResponse.json({ error: "Write something first" }, { status: 400 });

    const user = await UserModel.findById(userId).select("name settings").lean<any>();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Quick preset (see types/index.ts Visibility) overrides the
    // account default when the composer's picker is used; otherwise
    // fall back to the existing publicThoughts setting.
    const accountDefault = user.settings?.privacy?.publicThoughts !== false ? "followers" : "private";
    const v = ["public", "followers", "private"].includes(visibility) ? visibility : accountDefault;

    const doc = await ThoughtModel.create({
      userId, seriesId, episodeId,
      atSec: Math.max(0, Math.floor(atSec)),
      text: body.slice(0, 500),
      parentId,
      visibility: v,
      // Kept in sync with visibility for any code still reading the
      // older isPublic field.
      isPublic: v !== "private",
    });

    // Notify the parent author on a reply (never yourself).
    if (parentId) {
      const parent = await ThoughtModel.findById(parentId).select("userId").lean<any>();
      if (parent && parent.userId !== userId) {
        await notifyAndPush(parent.userId, {
          category: "social",
          type: "thought_reply",
          title: `${user.name || "Someone"} replied to your thought`,
          message: body.slice(0, 90),
          link: `/series/${seriesId}`,
          fromUserId: userId,
          fromUserName: user.name,
          toggle: "thoughtReplies",
          pushUrl: `/series/${seriesId}`,
        }).catch(() => {});
        await ThoughtModel.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
      }
    }

    const [hydrated] = await hydrate([doc.toObject()], userId);
    return NextResponse.json(hydrated, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
