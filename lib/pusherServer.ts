import Pusher from "pusher";

// Server-side Pusher client — used only inside API routes to trigger
// events. The secret must never reach the browser, so this file is
// only ever imported from server code (route.ts files).
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});
