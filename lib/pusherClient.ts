"use client";
import Pusher from "pusher-js";

// The Pusher "key" (unlike the secret) is safe to expose to the
// browser — that's how Pusher's client SDK is designed to work.
// Reused as a singleton so we don't open a new socket per component.
let client: Pusher | null = null;

export function getPusherClient(): Pusher {
  if (!client) {
    client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return client;
}
