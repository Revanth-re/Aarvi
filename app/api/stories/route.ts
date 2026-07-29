import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StoryModel } from "@/models/Story";
import { UserModel } from "@/models/User";
import { publicUser, idOf, iso } from "@/lib/serialize";
import { StoryGroup } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/stories?userId=<me>
//
// Returns the home rail: one group per author, newest story first.
// Scoped to people you follow plus yourself — a global story feed would
// fill the rail with strangers.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const me = req.nextUrl.searchParams.get("userId") || "";

    let authorIds: string[] | null = null;
    if (me) {
      const user = await UserModel.findById(me).select("following").lean<any>();
      authorIds = [...(user?.following ?? []), me];
    }

    // The explicit expiry filter matters: Mongo's TTL reaper only runs
    // about once a minute, so without it an expired story stays visible.
    const q: any = { expiresAt: { $gt: new Date() } };
    if (authorIds) q.userId = { $in: authorIds };

    const stories = await StoryModel.find(q).sort({ createdAt: -1 }).limit(200).lean<any[]>();
    if (!stories.length) return NextResponse.json([]);

    const users = await UserModel
      .find({ _id: { $in: [...new Set(stories.map(s => s.userId))] } })
      .select("name handle image").lean<any[]>();
    const byId = new Map(users.map(u => [idOf(u._id), u]));

    const groups = new Map<string, StoryGroup>();
    for (const s of stories) {
      const u = byId.get(s.userId);
      if (!u) continue;  // author deleted — skip rather than render a ghost

      if (!groups.has(s.userId)) {
        const pu = publicUser(u);
        groups.set(s.userId, {
          userId: s.userId, name: pu.name, handle: pu.handle, image: pu.image,
          stories: [], seen: false, latestKind: s.kind,
        });
      }
      groups.get(s.userId)!.stories.push({
        _id: idOf(s._id), userId: s.userId, kind: s.kind,
        caption: s.caption || "", mediaUrl: s.mediaUrl || "",
        createdAt: iso(s.createdAt), expiresAt: iso(s.expiresAt),
        viewCount: (s.viewedBy || []).length,
      });
    }

    // Your own story first, then everyone else newest-first (map
    // insertion order already reflects the sort above).
    const list = [...groups.values()];
    list.sort((a, b) => (a.userId === me ? -1 : b.userId === me ? 1 : 0));

    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/stories — publish a story.
// Body: { userId, kind: "audio"|"photo"|"quote", caption, mediaUrl? }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, kind, caption = "", mediaUrl = "" } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (!["audio", "photo", "quote"].includes(kind)) {
      return NextResponse.json({ error: "kind must be audio, photo or quote" }, { status: 400 });
    }

    // A quote is only text, so it must have some; audio and photo are
    // meaningless without their media.
    if (kind === "quote" && !String(caption).trim()) {
      return NextResponse.json({ error: "Write something to post a quote" }, { status: 400 });
    }
    if (kind !== "quote" && !mediaUrl) {
      return NextResponse.json(
        { error: `Upload ${kind === "audio" ? "an audio clip" : "a photo"} first` },
        { status: 400 }
      );
    }

    const doc = await StoryModel.create({
      userId, kind,
      caption: String(caption).slice(0, 280),
      mediaUrl,
    });

    return NextResponse.json({ _id: idOf(doc._id), ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
