import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { notifyUser } from "@/lib/notify";

type P = { params: Promise<{ id: string }> };

// POST: accept or decline a pending follow request that someone sent
// to user [id]. Body: { requesterId: string, action: "accept" | "decline" }
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { requesterId, action } = await req.json();

    if (!requesterId || (action !== "accept" && action !== "decline")) {
      return NextResponse.json({ error: "requesterId and a valid action are required" }, { status: 400 });
    }

    const actor = await UserModel.findById(id);
    if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const requester = await UserModel.findById(requesterId);
    if (!requester) return NextResponse.json({ error: "Requester no longer exists" }, { status: 404 });

    actor.followRequestsReceived = actor.followRequestsReceived || [];
    if (!actor.followRequestsReceived.includes(requesterId)) {
      return NextResponse.json({ error: "No pending request from that user" }, { status: 400 });
    }

    // Clear the pending request on both sides regardless of outcome.
    actor.followRequestsReceived = actor.followRequestsReceived.filter((x: string) => x !== requesterId);
    requester.followRequestsSent = (requester.followRequestsSent || []).filter((x: string) => x !== id);

    if (action === "accept") {
      requester.following = requester.following || [];
      if (!requester.following.includes(id)) requester.following.push(id);
    }

    await Promise.all([actor.save(), requester.save()]);

    if (action === "accept") {
      await notifyUser(requesterId, {
        type: "follow_accept",
        message: `${actor.name || "Someone"} accepted your follow request`,
        link: `/u/${id}`,
        fromUserId: id,
        fromUserName: actor.name,
      });
    }

    return NextResponse.json({ followRequestsReceived: actor.followRequestsReceived });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
