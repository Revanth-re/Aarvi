import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ConversationModel, MessageModel, conversationKey } from "@/models/Conversation";
import { UserModel } from "@/models/User";
import { idOf, iso, publicUser } from "@/lib/serialize";
import { sendPushToUser } from "@/lib/push";
import { notifyUser } from "@/lib/notify";

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
          ...(m.storyRef ? { storyRef: m.storyRef } : {}),
          ...(m.attachment ? { attachment: m.attachment } : {}),
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
          text: last.text || (last.attachment?.kind === "video" ? "Video" : last.attachment ? "Photo" : ""),
          createdAt: iso(last.createdAt), read: true,
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

// POST /api/messages — { userId, toId, text, storyRef?, attachment? }
// storyRef: { storyId, kind, mediaUrl, caption } — set when this
// message is a reply to a story rather than a normal DM.
// attachment: { url, kind: "image" | "video" } — an image/GIF/video
// sent from the thread's attach button, with or without caption text.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, toId, text, storyRef, attachment } = await req.json();

    if (!userId || !toId) return NextResponse.json({ error: "userId and toId are required" }, { status: 400 });
    if (userId === toId) return NextResponse.json({ error: "You can't message yourself" }, { status: 400 });

    // A story reply or an attachment can be sent with just that and no
    // typed caption — but an entirely empty message needs *some*
    // content to send.
    const body = String(text ?? "").trim();
    if (!body && !storyRef && !attachment?.url) return NextResponse.json({ error: "Message is empty" }, { status: 400 });

    // Respect the recipient's "Allow messages from anyone" setting —
    // if it's off, only people they follow can reach them.
    const to = await UserModel.findById(toId).select("settings following").lean<any>();
    if (!to) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });

    const open = to.settings?.privacy?.allowMessages !== false;
    if (!open && !(to.following ?? []).includes(userId)) {
      return NextResponse.json({ error: "This person only accepts messages from people they follow" }, { status: 403 });
    }

    // Story replies specifically need the Instagram rule: you can only
    // reply to a story if you follow that person — viewing it doesn't
    // require that (the home rail is already follow-scoped), but the
    // swipe-up reply itself is gated regardless of their general
    // allowMessages setting above.
    if (storyRef?.storyId) {
      const me = await UserModel.findById(userId).select("following").lean<any>();
      if (!(me?.following ?? []).includes(toId)) {
        return NextResponse.json({ error: "Follow them to reply to their story" }, { status: 403 });
      }
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

    // A bare story reply with no caption still gets a fallback caption
    // so the thread list has something to preview; a bare attachment
    // doesn't need one — the thread list falls back to "Photo"/"Video".
    const fallbackText = !body && storyRef ? "Replied to your story" : body;

    const msg = await MessageModel.create({
      conversationId: idOf(convo._id),
      senderId: userId,
      text: fallbackText.slice(0, 2000),
      readBy: [userId],
      ...(storyRef?.storyId ? {
        storyRef: {
          storyId: String(storyRef.storyId),
          kind: storyRef.kind,
          mediaUrl: storyRef.mediaUrl || "",
          caption: storyRef.caption || "",
        },
      } : {}),
      ...(attachment?.url ? {
        attachment: { url: String(attachment.url), kind: attachment.kind === "video" ? "video" : "image" },
      } : {}),
    });

    // Sender's name is needed for both the in-app bell and the push
    // payload below, so it's fetched once regardless of the push toggle.
    const sender = await UserModel.findById(userId).select("name").lean<any>();
    const preview = msg.text || (msg.attachment?.kind === "video" ? "Sent a video" : msg.attachment ? "Sent a photo" : "New message");

    // In-app notification bell — always shows new DMs, regardless of the
    // recipient's push toggle (that toggle only controls whether it also
    // buzzes their device; the bell itself should never miss a message).
    await notifyUser(toId, {
      type: "new_message",
      category: "social",
      title: sender?.name || "New message",
      message: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
      link: `/messages?with=${userId}`,
      fromUserId: userId,
      fromUserName: sender?.name,
    });

    // Device push notification — "if any messages sent by any other
    // people in app the notification should come in their notification
    // bar like WhatsApp/Insta." Respects the recipient's own toggle
    // (Settings → Notifications → "Push new messages to this device",
    // default on). Awaited (not fire-and-forget) because serverless
    // functions can get torn down right after the response is sent,
    // which would silently kill a detached async call before it
    // actually reaches the push service — sendPushToUser itself never
    // throws, so this can't turn a push failure into a failed send.
    if (to.settings?.notif?.newMessages !== false) {
      await sendPushToUser(toId, {
        title: sender?.name || "New message",
        body: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
        url: `/messages?with=${userId}`,
      });
    }

    return NextResponse.json({
      message: {
        _id: idOf(msg._id), conversationId: idOf(convo._id),
        senderId: userId, text: msg.text, createdAt: iso(msg.createdAt), read: true,
        ...(msg.storyRef ? { storyRef: msg.storyRef } : {}),
        ...(msg.attachment ? { attachment: msg.attachment } : {}),
      },
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
