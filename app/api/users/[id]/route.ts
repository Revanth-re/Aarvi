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
      image: user.image || "",
      createdAt: user.createdAt,
      followerCount,
      followingCount: (user.following || []).length,
    });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
