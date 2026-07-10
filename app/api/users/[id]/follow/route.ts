import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { notifyUser } from "@/lib/notify";

type P = { params: Promise<{ id: string }> };

// POST: send/cancel a follow request, or unfollow, for user [id]
// following `targetId`. Instagram-style — following someone doesn't
// take effect until they accept, except unfollowing an already-
// accepted follow, which is immediate.
// Body: { targetId: string }
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { targetId } = await req.json();

    if (!targetId) return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    if (targetId === id) return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });

    const actor = await UserModel.findById(id);
    if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const target = await UserModel.findById(targetId);
    if (!target) return NextResponse.json({ error: "That user doesn't exist" }, { status: 404 });

    actor.following = actor.following || [];
    actor.followRequestsSent = actor.followRequestsSent || [];
    target.followRequestsReceived = target.followRequestsReceived || [];

    let status: "none" | "requested";

    if (actor.following.includes(targetId)) {
      // Already following (accepted) → unfollow, immediate.
      actor.following = actor.following.filter((x: string) => x !== targetId);
      status = "none";
      await actor.save();
    } else if (actor.followRequestsSent.includes(targetId)) {
      // Pending request → cancel it.
      actor.followRequestsSent = actor.followRequestsSent.filter((x: string) => x !== targetId);
      target.followRequestsReceived = target.followRequestsReceived.filter((x: string) => x !== id);
      status = "none";
      await Promise.all([actor.save(), target.save()]);
    } else {
      // Nothing yet → send a new request.
      actor.followRequestsSent.push(targetId);
      target.followRequestsReceived.push(id);
      status = "requested";
      await Promise.all([actor.save(), target.save()]);

      await notifyUser(targetId, {
        type: "follow_request",
        message: `${actor.name || "Someone"} wants to follow you`,
        link: "/profile?tab=requests",
        fromUserId: id,
        fromUserName: actor.name,
      });
    }

    return NextResponse.json({
      status,
      following: actor.following,
      followRequestsSent: actor.followRequestsSent,
    });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
