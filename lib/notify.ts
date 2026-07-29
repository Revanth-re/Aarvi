import { NotificationModel } from "@/models/Notification";
import { NotificationCategory } from "@/types";

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
