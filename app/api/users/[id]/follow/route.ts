import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type P = { params: Promise<{ id: string }> };

// POST: toggle following of `targetId` on user [id]'s own document.
// Body: { targetId: string }
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { targetId } = await req.json();

    if (!targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    if (targetId === id) return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });

    const user = await UserModel.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const target = await UserModel.findById(targetId).lean();
    if (!target) return NextResponse.json({ error: "That user doesn't exist" }, { status: 404 });

    user.following = user.following || [];
    const idx = user.following.indexOf(targetId);
    if (idx >= 0) user.following.splice(idx, 1);
    else user.following.push(targetId);
    await user.save();

    return NextResponse.json({ following: user.following });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
