import { NextRequest, NextResponse } from "next/server";
import { COIN_PACKS } from "@/lib/gamification";

// POST /api/coins/razorpay/order — Body: { packKey } → a real Razorpay
// order for that pack's price. Called via REST (Basic auth with the
// key id/secret) rather than the razorpay npm SDK, to avoid adding a
// new dependency for two endpoints.
export async function POST(req: NextRequest) {
  try {
    const { packKey } = await req.json();
    const pack = COIN_PACKS.find(p => p.key === packKey);
    if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 400 });

    const keyId = process.env.RAZOR_PAY_KEY_ID;
    const keySecret = process.env.RAZOR_PAY_SECRET_KEY;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Payments aren't configured on this server" }, { status: 500 });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      // Razorpay wants the amount in paise (₹1 = 100 paise).
      body: JSON.stringify({ amount: pack.price * 100, currency: "INR", receipt: `coins_${packKey}_${Date.now()}` }),
    });
    const order = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: order?.error?.description || "Order creation failed" }, { status: 500 });
    }

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
