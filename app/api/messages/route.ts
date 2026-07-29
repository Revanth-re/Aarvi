import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ConversationModel, MessageModel, conversationKey } from "@/models/Conversation";
import { UserModel } from "@/models/User";
import { idOf, iso, publicUser } from "@/lib/serialize";

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET /api/messages?userId=            → conversation list
// GET /api/messages?userId=&with=<id>  → one thread's messages
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    const me = p.get("userId");
    const withId = p.get("with");
    if (!me) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    // ── One thread ──
    if (withId) {
      const convo = await ConversationModel.findOne({ key: conversationKey(me, withId) }).lean<any>();
      if (!convo) return NextResponse.json({ messages: [] });

      const rows = await MessageModel.find({ conversationId: idOf(convo._id) })
        .sort({ createdAt: 1 }).limit(200).lean<any[]>();

      // Opening a thread marks the other side's messages as read.
      await MessageModel.updateMany(
        { conversationId: idOf(convo._id), senderId: { $ne: me }, readBy: { $ne: me } },
        { $addToSet: { readBy: me } }
      );

      return NextResponse.json({
        messages: rows.map(m => ({
          _id: idOf(m._id), conversationId: idOf(m.conversationId),
          senderId: m.senderId, text: m.text,
          createdAt: iso(m.createdAt),
          read: (m.readBy || []).includes(me),
        })),
      });
    }

    // ── List ──
    const convos = await ConversationModel.find({ participants: me })
      .sort({ lastMessageAt: -1 }).limit(50).lean<any[]>();
    if (!convos.length) return NextResponse.json({ conversations: [] });

    const otherIds = convos.map(c => (c.participants || []).find((x: string) => x !== me)).filter(Boolean);
    const users = await UserModel.find({ _id: { $in: otherIds } }).select("name handle image").lean<any[]>();
    const byId = new Map(users.map(u => [idOf(u._id), u]));

    const conversations = await Promise.all(convos.map(async (c) => {
      const otherId = (c.participants || []).find((x: string) => x !== me);
      const other = byId.get(otherId);
      const last = await MessageModel.findOne({ conversationId: idOf(c._id) })
        .sort({ createdAt: -1 }).lean<any>();
      const unread = await MessageModel.countDocuments({
        conversationId: idOf(c._id), senderId: { $ne: me }, readBy: { $ne: me },
      });

      return {
        _id: idOf(c._id),
        participants: other ? [publicUser(other)] : [],
        lastMessage: last ? {
          _id: idOf(last._id), conversationId: idOf(c._id), senderId: last.senderId,
          text: last.text, createdAt: iso(last.createdAt), read: true,
        } : undefined,
        unread,
        updatedAt: iso(c.lastMessageAt),
      };
    }));

    return NextResponse.json({ conversations: conversations.filter(c => c.participants.length) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/messages — { userId, toId, text }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, toId, text } = await req.json();

    if (!userId || !toId) return NextResponse.json({ error: "userId and toId are required" }, { status: 400 });
    if (userId === toId) return NextResponse.json({ error: "You can't message yourself" }, { status: 400 });

    const body = String(text ?? "").trim();
    if (!body) return NextResponse.json({ error: "Message is empty" }, { status: 400 });

    // Respect the recipient's "Allow messages from anyone" setting —
    // if it's off, only people they follow can reach them.
    const to = await UserModel.findById(toId).select("settings following").lean<any>();
    if (!to) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

    const open = to.settings?.privacy?.allowMessages !== false;
    if (!open && !(to.following ?? []).includes(userId)) {
      return NextResponse.json({ error: "This person only accepts messages from people they follow" }, { status: 403 });
    }

    const key = conversationKey(userId, toId);
    // Upsert on the unique key so two people opening a thread at the
    // same moment can't create duplicate conversations.
    const convo = await ConversationModel.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, participants: [userId, toId], createdAt: new Date() },
        $set: { lastMessageAt: new Date() } },
      { upsert: true, new: true }
    );

    const msg = await MessageModel.create({
      conversationId: idOf(convo._id),
      senderId: userId,
      text: body.slice(0, 2000),
      readBy: [userId],
    });

    return NextResponse.json({
      message: {
        _id: idOf(msg._id), conversationId: idOf(convo._id),
        senderId: userId, text: msg.text, createdAt: iso(msg.createdAt), read: true,
      },
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
