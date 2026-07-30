import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StoryModel } from "@/models/Story";

type P = { params: Promise<{ id: string }> };

// PATCH /api/stories/[id] — { userId, hidden } — toggle "hide from
// followers" on a story you own. Hidden stories still show to you
// (see GET /api/stories), just not to anyone else.
export async function PATCH(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId, hidden } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const story = await StoryModel.findById(id);
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (story.userId !== userId) return NextResponse.json({ error: "Not your story" }, { status: 403 });

    story.hidden = !!hidden;
    await story.save();

    return NextResponse.json({ ok: true, hidden: story.hidden });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/stories/[id]?userId= — remove a story you own, before
// its normal 24h expiry.
export async function DELETE(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const story = await StoryModel.findById(id).select("userId").lean<{ userId: string } | null>();
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (story.userId !== userId) return NextResponse.json({ error: "Not your story" }, { status: 403 });

    await StoryModel.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
