import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { notifyAndPush } from "@/lib/notify";

type P = { params: Promise<{ id: string }> };

// POST: follow/unfollow (or request/cancel-request) user [id] →
// `targetId`. Instagram-style: a public account (the default) is
// followed immediately; a private account (settings.privacy.isPrivate)
// queues a request the owner has to accept first. Unfollowing an
// already-accepted follow is always immediate either way.
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

    let status: "none" | "requested" | "following";

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
    } else if (target.settings?.privacy?.isPrivate) {
      // Private account → send a request, wait for approval.
      actor.followRequestsSent.push(targetId);
      target.followRequestsReceived.push(id);
      status = "requested";
      await Promise.all([actor.save(), target.save()]);

      await notifyAndPush(targetId, {
        type: "follow_request",
        category: "social",
        title: `${actor.name || "Someone"} wants to follow you`,
        message: "Tap to review the request.",
        link: "/profile/requests",
        fromUserId: id,
        fromUserName: actor.name,
        toggle: "follows",
        pushUrl: "/profile/requests",
      });
    } else {
      // Public account (the default) → follow immediately, no approval needed.
      actor.following.push(targetId);
      status = "following";
      await actor.save();

      await notifyAndPush(targetId, {
        type: "new_follower",
        category: "social",
        title: `${actor.name || "Someone"} started following you`,
        message: "",
        link: `/u/${id}`,
        fromUserId: id,
        fromUserName: actor.name,
        toggle: "follows",
        pushUrl: `/u/${id}`,
      });
    }

    return NextResponse.json({
      status,
      following: actor.following,
      followRequestsSent: actor.followRequestsSent,
    });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
