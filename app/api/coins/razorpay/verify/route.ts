import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { recordCoins } from "@/lib/gamificationServer";
import { COIN_PACKS } from "@/lib/gamification";

// POST /api/coins/razorpay/verify
// Body: { userId, packKey, razorpay_order_id, razorpay_payment_id, razorpay_signature }
//
// The one part of this flow that actually matters for security: coins
// are only credited if the HMAC signature Razorpay returns checks out
// against our own key secret, proving the payment really happened and
// wasn't forged client-side.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, packKey, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!userId || !packKey || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }
    const pack = COIN_PACKS.find(p => p.key === packKey);
    if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 400 });

    const keySecret = process.env.RAZOR_PAY_SECRET_KEY;
    if (!keySecret) return NextResponse.json({ error: "Payments aren't configured on this server" }, { status: 500 });

    const expected = crypto.createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const user = await UserModel.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const total = pack.coins + pack.bonus;
    const balance = await recordCoins(user, total, "purchase", `${pack.key} — ₹${pack.price} via Razorpay`);
    await user.save();

    return NextResponse.json({ balance, coins: total });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
