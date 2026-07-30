import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type P = { params: Promise<{ id: string }> };

// GET: public-safe profile lookup for another user (used by /u/[id]).
// Deliberately does NOT return email, favorites, or playlists — those
// stay private to the account owner. followerCount/followingCount are
// safe to expose publicly (Instagram-style profile header).
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const user = await UserModel.findById(id).lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const followerCount = await UserModel.countDocuments({ following: id });

    return NextResponse.json({
      _id: user._id.toString(),
      name: user.name || "Listener",
      handle: user.handle || "",
      bio: user.bio || "",
      image: user.image || "",
      createdAt: user.createdAt,
      followerCount,
      followingCount: (user.following || []).length,
      isPrivate: !!user.settings?.privacy?.isPrivate,
    });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// DELETE /api/users/[id] — { userId } must match [id]: an account can
// only delete itself, mirroring the app's existing trust model (no
// real server sessions, so every mutating route checks a client-sent
// id matches who it's acting on).
//
// This is a soft delete (models/User.ts already has applyBaseSchema's
// .softDelete()) — every default find/count query in the app already
// excludes deletedAt-set documents, so the account effectively stops
// existing everywhere (can't log in, follow, message, or show up in
// any list) without a destructive, unrecoverable hard delete. Their
// series/episodes/thoughts/messages are left as-is rather than
// cascade-deleted — a much bigger, riskier operation this doesn't
// attempt.
//
// The handle/mobile/email/googleId are cleared *before* the soft
// delete so they free up for reuse — those indexes are sparse-unique,
// so clearing (not just leaving them set on a hidden row) is what lets
// someone else take that same @handle or number later.
export async function DELETE(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = await req.json().catch(() => ({}));
    if (userId !== id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const user = await UserModel.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    user.handle = undefined;
    user.mobile = undefined;
    user.email = undefined;
    user.googleId = undefined;
    await user.softDelete(id); // sets deletedAt/deletedBy/status and saves once

    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
