import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StoryModel } from "@/models/Story";

type P = { params: Promise<{ id: string }> };

// POST /api/stories/[id]/view — mark as seen.
// $addToSet rather than $push so re-opening a story can't inflate the
// view count.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const doc = await StoryModel.findByIdAndUpdate(
      id, { $addToSet: { viewedBy: userId } }, { new: true }
    ).lean<{ viewedBy?: string[] }>();

    if (!doc) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    return NextResponse.json({ ok: true, viewCount: (doc.viewedBy || []).length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
