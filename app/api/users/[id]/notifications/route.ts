import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { NotificationModel } from "@/models/Notification";
import { idOf, iso } from "@/lib/serialize";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// GET /api/users/[id]/notifications?category=all|drops|social|coins
//
// The tab filter is a database query rather than client-side filtering
// of an "all" payload, so a busy account doesn't ship hundreds of rows
// to render five.
export async function GET(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const category = req.nextUrl.searchParams.get("category") || "all";

    const q: any = { userId: id };
    if (category !== "all") q.category = category;

    const rows = await NotificationModel.find(q).sort({ createdAt: -1 }).limit(60).lean<any[]>();
    const unread = await NotificationModel.countDocuments({ userId: id, read: false });

    return NextResponse.json({
      unread,
      notifications: rows.map(n => ({
        _id: idOf(n._id),
        type: n.type,
        category: n.category || "system",
        title: n.title || n.message || "",
        message: n.message || "",
        link: n.link || "",
        fromUserId: n.fromUserId, fromUserName: n.fromUserName,
        read: !!n.read,
        createdAt: iso(n.createdAt),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
