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
    UserModel.updateOne({ _id: me }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
    const noteOf = (u: any) => {
      const n = u?.note;
      if (!n?.at || Date.now() - new Date(n.at).getTime() >= 864e5 || !(n.text || n.musicUrl || n.ep?.episodeId)) return undefined;
      return { text: n.text, bg: n.bg, musicUrl: n.musicUrl, musicName: n.musicName, musicStart: n.musicStart, musicEnd: n.musicEnd, ep: n.ep?.episodeId ? n.ep : undefined };
    };

    // ── One thread ──
    if (withId) {
      const convo = await ConversationModel.findOne({ key: conversationKey(me, withId) }).lean<any>();
      if (!convo) { const pe = await UserModel.findById(withId).select("lastSeenAt").lean<any>().catch(() => null); return NextResponse.json({ messages: [], peerLastSeenAt: pe?.lastSeenAt ? iso(pe.lastSeenAt) : null }); }

      const rows = await MessageModel.find({ conversationId: idOf(convo._id) })
        .sort({ createdAt: 1 }).limit(200).lean<any[]>();

      // Opening a thread marks the other side's messages as read.
      await MessageModel.updateMany(
        { conversationId: idOf(convo._id), senderId: { $ne: me }, readBy: { $ne: me } },
        { $addToSet: { readBy: me } }
      );

      const peer = await UserModel.findById(withId).select("lastSeenAt").lean<any>().catch(() => null);
      return NextResponse.json({
        peerLastSeenAt: peer?.lastSeenAt ? iso(peer.lastSeenAt) : null,
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
    const meDoc = await UserModel.findById(me).select("note").lean<any>().catch(() => null);
    const myNote = noteOf(meDoc) ?? null;
    if (!convos.length) return NextResponse.json({ conversations: [], myNote });

    const otherIds = convos.map(c => (c.participants || []).find((x: string) => x !== me)).filter(Boolean);
    const users = await UserModel.find({ _id: { $in: otherIds } }).select("name handle image lastSeenAt note").lean<any[]>();
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
        participants: other ? [{ ...publicUser(other), lastSeenAt: other.lastSeenAt ? iso(other.lastSeenAt) : undefined, note: noteOf(other) }] : [],
        lastMessage: last ? {
          _id: idOf(last._id), conversationId: idOf(c._id), senderId: last.senderId,
          text: last.text || (last.attachment?.kind === "video" ? "Video" : last.attachment?.kind === "audio" ? "Audio" : last.attachment ? "Photo" : ""),
          createdAt: iso(last.createdAt), read: true,
        } : undefined,
        unread,
        updatedAt: iso(c.lastMessageAt),
      };
    }));

    return NextResponse.json({ myNote, conversations: conversations.filter(c => c.participants.length) });
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
        attachment: { url: String(attachment.url), kind: attachment.kind === "video" ? "video" : attachment.kind === "audio" ? "audio" : "image" },
      } : {}),
    });

    // Sender's name is needed for both the in-app bell and the push
    // payload below, so it's fetched once regardless of the push toggle.
    const sender = await UserModel.findById(userId).select("name").lean<any>();
    const preview = msg.text || (msg.attachment?.kind === "video" ? "Sent a video" : msg.attachment?.kind === "audio" ? "Sent audio" : msg.attachment ? "Sent a photo" : "New message");

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

// PATCH /api/messages — { userId, note } sets (or clears, if empty) your 24h Note.
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const { userId, note } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const n: any = note && typeof note === "object" ? note : { text: note };
    const s = (v: any, max = 300) => (v ? String(v).slice(0, max) : undefined);
    const clean: any = {
      text: s(String(n.text ?? "").trim(), 60), bg: s(n.bg, 40),
      musicUrl: s(n.musicUrl), musicName: s(n.musicName, 80),
      musicStart: Math.max(0, Number(n.musicStart) || 0), musicEnd: Number(n.musicEnd) > 0 ? Number(n.musicEnd) : undefined,
      ep: n.ep?.episodeId ? {
        seriesId: s(n.ep.seriesId, 60), seriesTitle: s(n.ep.seriesTitle, 120), episodeId: s(n.ep.episodeId, 60),
        title: s(n.ep.title, 120), cover: s(n.ep.cover), audioUrl: s(n.ep.audioUrl), start: Math.max(0, Number(n.ep.start) || 0),
        end: Number(n.ep.end) > 0 ? Number(n.ep.end) : undefined,
      } : undefined,
    };
    const has = clean.text || clean.musicUrl || clean.ep;
    await UserModel.updateOne({ _id: userId }, has ? { $set: { note: { ...clean, at: new Date() } } } : { $unset: { note: 1 } });
    return NextResponse.json({ note: has ? clean : null });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
