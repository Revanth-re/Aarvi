import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StoryModel } from "@/models/Story";
import { UserModel } from "@/models/User";
import { publicUser } from "@/lib/serialize";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// GET /api/stories/[id]/viewers?userId=<requester>&kind=views|likes
//
// Only the story's own owner can see who viewed or liked it — same
// privacy model Instagram/WhatsApp give story stats (everyone else
// just gets the heart to tap, not the list). No per-view/like
// timestamp is stored, so the order returned is whatever Mongo hands
// back rather than "most recent first".
export async function GET(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const requesterId = req.nextUrl.searchParams.get("userId") || "";
    const kind = req.nextUrl.searchParams.get("kind") === "likes" ? "likes" : "views";

    const story = await StoryModel.findById(id).select("userId viewedBy likedBy").lean<any>();
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (!requesterId || story.userId !== requesterId) {
      return NextResponse.json({ error: "Only the story's owner can see this" }, { status: 403 });
    }

    const ids: string[] = kind === "likes" ? (story.likedBy || []) : (story.viewedBy || []);
    if (!ids.length) return NextResponse.json({ users: [] });

    const rows = await UserModel.find({ _id: { $in: ids } }).select("name handle image").lean<any[]>();
    return NextResponse.json({ users: rows.map(publicUser) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
