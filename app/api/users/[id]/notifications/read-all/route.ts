import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { NotificationModel } from "@/models/Notification";

type P = { params: Promise<{ id: string }> };

// POST: mark all of this user's notifications as read (called when
// they open the notification bell dropdown).
export async function POST(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    await NotificationModel.updateMany({ userId: id, read: false }, { read: true });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
