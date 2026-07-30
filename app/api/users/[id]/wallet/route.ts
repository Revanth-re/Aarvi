import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { CoinTxModel } from "@/models/CoinTx";
import { recordCoins } from "@/lib/gamificationServer";
import { COIN_PACKS } from "@/lib/gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// ⚠️ NO REAL PAYMENTS ARE PROCESSED HERE.
//
// Coins are a soft currency. The "buy a coin pack" action below only
// grants coins when DEMO_WALLET=true is set in the environment, and
// otherwise returns 501. That's deliberate: wiring a real gateway
// (Razorpay/Stripe) means server-side order creation plus signature
// verification of the provider's webhook, and granting coins on an
// unverified client request would let anyone mint currency for free by
// calling this endpoint directly. Replace the DEMO branch with a real
// verified-webhook handler before charging anyone.
const DEMO_WALLET = process.env.DEMO_WALLET === "true";

// GET /api/users/[id]/wallet — balance + recent ledger + packs.
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;

    const user = await UserModel.findById(id).select("coins").lean<any>();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const transactions = await CoinTxModel.find({ userId: id })
      .sort({ createdAt: -1 }).limit(50).lean<any[]>();

    return NextResponse.json({
      coins: user.coins ?? 0,
      transactions: transactions.map(t => ({ ...t, _id: t._id.toString() })),
      packs: COIN_PACKS,
      demoMode: DEMO_WALLET,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/users/[id]/wallet — purchase a coin pack.
// Body: { packKey: string }
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { packKey } = await req.json();

    const pack = COIN_PACKS.find(p => p.key === packKey);
    if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 400 });

    if (!DEMO_WALLET) {
      return NextResponse.json({
        error: "Payments are not configured yet.",
        detail:
          "Coin purchases need a verified payment webhook before they can grant " +
          "currency. Set DEMO_WALLET=true to try the flow with test coins.",
      }, { status: 501 });
    }

    const user = await UserModel.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const balance = await recordCoins(
      user, pack.coins, "purchase", `${pack.key} pack (demo — no payment taken)`
    );
    await user.save();

    return NextResponse.json({ coins: balance, granted: pack.coins, demo: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
