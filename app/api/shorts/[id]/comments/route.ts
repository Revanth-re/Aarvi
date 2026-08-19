import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ShortModel } from "@/models/Short";
import { ShortCommentModel } from "@/models/ShortComment";
import { UserModel } from "@/models/User";
import { idOf, iso } from "@/lib/serialize";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// GET /api/shorts/[id]/comments?userId=
export async function GET(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id: shortId } = await params;
    const me = req.nextUrl.searchParams.get("userId") || "";

    const comments = await ShortCommentModel.find({ shortId }).sort({ createdAt: 1 }).lean<any[]>();
    if (!comments.length) return NextResponse.json([]);

    const users = await UserModel.find({ _id: { $in: [...new Set(comments.map(c => c.userId))] } })
      .select("name handle image").lean<any[]>();
    const byId = new Map(users.map(u => [idOf(u._id), u]));

    return NextResponse.json(comments.map(c => {
      const u = byId.get(c.userId);
      return {
        _id: idOf(c._id), shortId: c.shortId, userId: c.userId,
        userName: u?.name || "Listener", userHandle: u?.handle ? `@${u.handle}` : "@listener",
        userImage: u?.image || "",
        text: c.text, createdAt: iso(c.createdAt), editedAt: c.editedAt ? iso(c.editedAt) : undefined,
        mine: !!me && c.userId === me,
      };
    }));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/shorts/[id]/comments — Body: { userId, text }
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id: shortId } = await params;
    const { userId, text } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const body = String(text ?? "").trim();
    if (!body) return NextResponse.json({ error: "Write something first" }, { status: 400 });

    const short = await ShortModel.findById(shortId).select("_id");
    if (!short) return NextResponse.json({ error: "Short not found" }, { status: 404 });

    const [comment, user] = await Promise.all([
      ShortCommentModel.create({ shortId, userId, text: body.slice(0, 500) }),
      UserModel.findById(userId).select("name handle image").lean<any>(),
      ShortModel.updateOne({ _id: shortId }, { $inc: { commentCount: 1 } }),
    ]);

    return NextResponse.json({
      _id: idOf(comment._id), shortId, userId,
      userName: user?.name || "Listener", userHandle: user?.handle ? `@${user.handle}` : "@listener",
      userImage: user?.image || "",
      text: comment.text, createdAt: iso(comment.createdAt), mine: true,
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
