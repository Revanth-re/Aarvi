import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ThoughtModel } from "@/models/Thought";

type P = { params: Promise<{ id: string }> };

// DELETE /api/thoughts/[id]?userId=<id> — only the thought's own author
// can delete it. Thought has no soft-delete plugin (unlike Series/User),
// so this is a real delete. If it was a reply, decrement the parent's
// replyCount; if it had its own replies, delete those too rather than
// leaving orphaned replies pointing at nothing.
export async function DELETE(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const thought = await ThoughtModel.findById(id).select("userId parentId").lean<{ userId: string; parentId: string | null }>();
    if (!thought) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (thought.userId !== userId) {
      return NextResponse.json({ error: "You can only delete your own thoughts" }, { status: 403 });
    }

    await ThoughtModel.deleteOne({ _id: id });
    // Its own replies would otherwise be orphaned (still visible via
    // ?parentId= but pointing at a thought that no longer exists).
    await ThoughtModel.deleteMany({ parentId: id });

    if (thought.parentId) {
      await ThoughtModel.findByIdAndUpdate(thought.parentId, { $inc: { replyCount: -1 } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
