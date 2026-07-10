import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusherServer";

type P = { params: Promise<{ code: string }> };

const ALLOWED_EVENTS = new Set([
  "play", "pause", "seek", "episode-change", "heartbeat", "reaction",
  // Sync handshake — lets someone who opens the link mid-episode catch
  // up instantly instead of waiting for the next play/pause.
  "sync-request", "sync-state",
  // Lightweight presence tracking (no Pusher presence channels, to
  // avoid needing a channel-auth endpoint) — joiners announce
  // themselves and heartbeat periodically; host aggregates and prunes.
  "member-join", "member-heartbeat", "member-leave", "member-count",
  // Shared room-wide chat, private 1:1 chat, and delivery/read receipts
  // for the private threads (group chat only ever shows "sent").
  "chat-message", "chat-delivered", "chat-read",
  "room-ended",
]);

// POST /api/rooms/[code]/event
// Body: { type: string, payload?: object }
// Relays a playback, presence, chat, or reaction event to everyone
// subscribed to this room's Pusher channel. Rooms are ephemeral —
// there's no database record of them, the room "exists" as long as
// someone's channel is active, and ends when the host taps "End
// session". Chat messages are relayed the same way and aren't saved
// anywhere, so they don't survive a refresh. Private ("DM") messages
// are still broadcast to the whole channel (no per-recipient delivery
// in Pusher's free tier without presence-channel auth) — clients just
// only render the ones addressed to them, so treat DMs here as
// "unlisted", not truly private/encrypted.
export async function POST(req: NextRequest, { params }: P) {
  try {
    const { code } = await params;
    const { type, payload } = await req.json();

    if (!type || !ALLOWED_EVENTS.has(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    if (!code || !/^[A-Z0-9]{4,12}$/.test(code)) {
      return NextResponse.json({ error: "Invalid room code" }, { status: 400 });
    }

    await pusherServer.trigger(`room-${code}`, type, payload || {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
