import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type P = { params: Promise<{ id: string }> };

// GET: populated list of user [id]'s followers. Followers are never
// stored directly — they're computed as "everyone whose `following`
// array contains this user's id", which is always in sync with the
// accepted-follow state on the follower's own doc.
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const followers = await UserModel.find({ following: id }).select("name image").lean();
    return NextResponse.json({
      followers: followers.map(u => ({ _id: u._id.toString(), name: u.name || "Listener", image: u.image || "" })),
    });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
