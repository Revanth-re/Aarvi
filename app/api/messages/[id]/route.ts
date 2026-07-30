import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MessageModel } from "@/models/Conversation";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// DELETE /api/messages/[id] — Body: { userId }
// Unsend, Instagram-style: only the sender can delete their own
// message, and it disappears from both sides rather than leaving a
// "this message was deleted" placeholder. Implemented as a flag
// (not a hard delete) so it can't break another message's replyTo
// snapshot that quotes it.
export async function DELETE(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const msg = await MessageModel.findById(id);
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (msg.senderId !== userId) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    msg.deleted = true;
    msg.text = "";
    (msg as any).attachment = undefined;
    await msg.save();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
