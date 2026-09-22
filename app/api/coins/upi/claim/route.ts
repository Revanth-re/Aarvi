import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UpiClaimModel } from "@/models/UpiClaim";
import { COIN_PACKS } from "@/lib/gamification";

// POST /api/coins/upi/claim — Body: { userId, packKey, refNumber? }
// Records the claim as pending — no coins credited here. The admin
// checks incoming UPI payments against pending claims by amount/time
// and approves via PATCH /api/admin/upi-claims/[id], which is what
// actually credits coins.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, packKey, refNumber } = await req.json();
    const pack = COIN_PACKS.find(p => p.key === packKey);
    if (!userId || !pack) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    await UpiClaimModel.create({ userId, packKey, amount: pack.price, refNumber: String(refNumber ?? "").trim() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
