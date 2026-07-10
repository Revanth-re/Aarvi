import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { NotificationModel } from "@/models/Notification";
import { pusherServer } from "@/lib/pusherServer";

type P = { params: Promise<{ id: string }> };

// GET: most recent notifications for this user (newest first).
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const notifications = await NotificationModel.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    return NextResponse.json({
      notifications: notifications.map(n => ({ ...n, _id: n._id.toString() })),
    });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// POST: create a notification for this user, and push it live via
// Pusher so it shows up instantly if they're online right now.
// Body: { type, message, link?, fromUserId?, fromUserName? }
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { type, message, link, fromUserId, fromUserName } = await req.json();

    if (!type || !message) {
      return NextResponse.json({ error: "type and message are required" }, { status: 400 });
    }

    const notification = await NotificationModel.create({
      userId: id, type, message, link, fromUserId, fromUserName,
    });

    const payload = {
      _id: notification._id.toString(),
      type, message, link, fromUserId, fromUserName,
      read: false, createdAt: notification.createdAt,
    };

    pusherServer.trigger(`user-${id}`, "notification", payload).catch(() => {});

    return NextResponse.json({ ok: true, notification: payload });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
