import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type P = { params: Promise<{ id: string }> };

// GET: populated list of people who've requested to follow user [id]
// (name + image only — used for the "Requests" tab on your own profile).
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const owner = await UserModel.findById(id).select("followRequestsReceived").lean();
    if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ids = owner.followRequestsReceived || [];
    if (ids.length === 0) return NextResponse.json({ requests: [] });

    const requesters = await UserModel.find({ _id: { $in: ids } }).select("name image").lean();
    return NextResponse.json({
      requests: requesters.map(u => ({ _id: u._id.toString(), name: u.name || "Listener", image: u.image || "" })),
    });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
