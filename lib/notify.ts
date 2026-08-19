import { NotificationModel } from "@/models/Notification";
import { UserModel } from "@/models/User";
import { NotificationCategory } from "@/types";
import { sendPushToUser } from "@/lib/push";
import { APP_TIMEZONE } from "@/lib/gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface NotifyInput {
  type: string;
  category?: NotificationCategory;
  title: string;
  message?: string;
  link?: string;
  fromUserId?: string;
  fromUserName?: string;
}

/**
 * Write a notification for a user.
 *
 * Swallows its own errors on purpose: a notification is a side effect
 * of some other action (a follow, a reply, a reward), and failing to
 * record it must never fail the action that triggered it.
 */
export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  try {
    await NotificationModel.create({
      userId,
      category: input.category ?? "system",
      type: input.type,
      title: input.title,
      message: input.message ?? "",
      link: input.link,
      fromUserId: input.fromUserId,
      fromUserName: input.fromUserName,
    });
  } catch {
    /* intentionally silent — see above */
  }
}

/** "HH:mm" in APP_TIMEZONE for the given instant. */
function hhmm(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

/** Handles the case where the window wraps past midnight (e.g. 22:00–07:00). */
function isWithinQuietHours(now: string, start: string, end: string): boolean {
  if (start === end) return false; // zero-width window — never quiet
  if (start < end) return now >= start && now < end;
  return now >= start || now < end; // wraps midnight
}

const NOTIF_TOGGLE_KEYS = [
  "episodeDrops", "creatorStories", "coinRewards", "thoughtReplies",
  "weeklyRecap", "newMessages", "follows", "tips", "storyUpdates", "likes",
] as const;
type NotifToggle = (typeof NOTIF_TOGGLE_KEYS)[number];

/**
 * The one function every push-worthy event should call: writes the
 * in-app notification (unconditionally — the bell always shows it),
 * then sends a device push only if both (a) the recipient's relevant
 * Settings → Notifications toggle is on, and (b) it isn't currently
 * inside their quiet hours window. This is what actually makes the
 * toggles in /settings/notifications do something — previously they
 * were read nowhere on the server.
 */
export async function notifyAndPush(
  userId: string,
  input: NotifyInput & { toggle: NotifToggle; pushUrl: string }
): Promise<void> {
  await notifyUser(userId, input);

  try {
    const user = await UserModel.findById(userId).select("settings").lean<any>();
    const notif = user?.settings?.notif;
    const quiet = user?.settings?.quietHours;

    // Default to "on" for a user who's never touched Settings, same
    // as the toggle's own schema default — undefined must not silently
    // suppress every push.
    const enabled = notif ? notif[input.toggle] !== false : true;
    if (!enabled) return;

    if (quiet?.enabled && isWithinQuietHours(hhmm(new Date()), quiet.start, quiet.end)) return;

    await sendPushToUser(userId, { title: input.title, body: input.message ?? "", url: input.pushUrl });
  } catch {
    /* push is best-effort — never throw over it */
  }
}
