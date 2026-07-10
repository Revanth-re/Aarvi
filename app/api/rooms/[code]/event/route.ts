import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusherServer";

type P = { params: Promise<{ code: string }> };

const ALLOWED_EVENTS = new Set(["play", "pause", "seek", "episode-change", "heartbeat", "reaction"]);

// POST /api/rooms/[code]/event
// Body: { type: string, payload?: object }
// Relays a playback or reaction event to everyone subscribed to this
// room's Pusher channel. Rooms are ephemeral — there's no database
// record of them, the room "exists" as long as someone's channel is
// active, and ends when the host taps "End session".
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
