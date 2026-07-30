import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/push/subscribe — { userId, subscription }
// `subscription` is the browser's PushSubscription.toJSON() — this
// device is now eligible to receive push notifications for this
// account. Upsert-by-endpoint: re-subscribing (e.g. after clearing the
// toggle off then on) replaces rather than duplicates the entry.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, subscription } = await req.json();
    if (!userId || !subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json({ error: "userId and subscription are required" }, { status: 400 });
    }

    await UserModel.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
    );
    await UserModel.updateOne(
      { _id: userId },
      { $push: { pushSubscriptions: { endpoint: subscription.endpoint, keys: subscription.keys } } }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/push/subscribe — { userId, endpoint }
// Called when the toggle is switched off, or when unregistering a
// subscription that's about to be replaced.
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { userId, endpoint } = await req.json();
    if (!userId || !endpoint) {
      return NextResponse.json({ error: "userId and endpoint are required" }, { status: 400 });
    }

    await UserModel.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint } } }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
