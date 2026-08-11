import webpush from "web-push";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Web Push (the same standard behind "real" notification-bar alerts on
// Android/desktop — a phone-installed PWA shows these exactly like a
// native app's notifications; iOS Safari supports it too as of 16.4+,
// but only once the app has been added to the home screen). Needs a
// VAPID key pair identifying this server to push services — see the
// setup note in CHANGES-swara-app.md for how to generate your own.
let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@example.com";
  if (!pub || !priv) return false; // not set up yet — callers no-op rather than throw
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path to open when the notification is tapped, e.g. "/messages?with=<id>". */
  url: string;
}

// Sends to every device the user has ever opted in on (subscriptions
// persist across sessions until they explicitly turn notifications
// off, or a browser invalidates one). A subscription that the push
// service reports as gone (410/404 — uninstalled, permission revoked,
// browser data cleared) is pruned from their record automatically so
// this list doesn't grow stale forever.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    await connectDB();
    const user = await UserModel.findById(userId).select("pushSubscriptions").lean<any>();
    const subs = user?.pushSubscriptions ?? [];
    if (!subs.length) return;

    const dead: string[] = [];
    await Promise.all(subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(sub.endpoint);
        // Any other error (network blip, service outage) — leave the
        // subscription in place and just skip this one send.
      }
    }));

    if (dead.length) {
      await UserModel.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: dead } } } }
      );
    }
  } catch {
    // Push is a nice-to-have, never worth failing the request that
    // triggered it (e.g. sending a message) over.
  }
}
