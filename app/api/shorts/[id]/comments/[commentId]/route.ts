import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ShortModel } from "@/models/Short";
import { ShortCommentModel } from "@/models/ShortComment";
import { requireAdmin } from "@/lib/requireAdmin";
import { iso } from "@/lib/serialize";

type P = { params: Promise<{ id: string; commentId: string }> };

// PATCH /api/shorts/[id]/comments/[commentId] — Body: { userId, text }
// Only the comment's own author (or an admin) can edit it.
export async function PATCH(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { commentId } = await params;
    const { userId, text } = await req.json();
    const body = String(text ?? "").trim();
    if (!body) return NextResponse.json({ error: "Write something first" }, { status: 400 });

    const comment = await ShortCommentModel.findById(commentId);
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const isAdmin = !requireAdmin(req);
    if (!isAdmin && comment.userId !== userId) {
      return NextResponse.json({ error: "You can only edit your own comment" }, { status: 403 });
    }

    comment.text = body.slice(0, 500);
    comment.editedAt = new Date();
    await comment.save();

    return NextResponse.json({ ok: true, text: comment.text, editedAt: iso(comment.editedAt) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/shorts/[id]/comments/[commentId]?userId=
// Only the comment's own author (or an admin) can delete it.
export async function DELETE(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id: shortId, commentId } = await params;
    const userId = req.nextUrl.searchParams.get("userId") || "";

    const comment = await ShortCommentModel.findById(commentId);
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const isAdmin = !requireAdmin(req);
    if (!isAdmin && comment.userId !== userId) {
      return NextResponse.json({ error: "You can only delete your own comment" }, { status: 403 });
    }

    await ShortCommentModel.findByIdAndDelete(commentId);
    await ShortModel.updateOne({ _id: shortId }, { $inc: { commentCount: -1 } });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
