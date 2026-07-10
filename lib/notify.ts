import { NotificationModel } from "@/models/Notification";
import { pusherServer } from "@/lib/pusherServer";

// Shared helper: create a notification doc and push it live over Pusher.
// Used by the follow-request/follow-response routes (and anywhere else
// that needs to notify a user) so the creation + push logic lives in
// exactly one place.
export async function notifyUser(userId: string, data: {
  type: string;
  message: string;
  link?: string;
  fromUserId?: string;
  fromUserName?: string;
}) {
  const notification = await NotificationModel.create({ userId, ...data });
  const payload = {
    _id: notification._id.toString(),
    type: data.type,
    message: data.message,
    link: data.link,
    fromUserId: data.fromUserId,
    fromUserName: data.fromUserName,
    read: false,
    createdAt: notification.createdAt,
  };
  pusherServer.trigger(`user-${userId}`, "notification", payload).catch(() => {});
  return payload;
}
