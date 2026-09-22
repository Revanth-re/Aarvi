import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UpiClaimModel } from "@/models/UpiClaim";
import { UserModel } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";
import { recordCoins } from "@/lib/gamificationServer";
import { COIN_PACKS } from "@/lib/gamification";

type P = { params: Promise<{ id: string }> };

// PATCH — Body: { action: "approve" | "reject" }
// Approving is the only thing that ever credits coins in this flow.
export async function PATCH(req: NextRequest, { params }: P) {
  const email = req.headers.get("x-user-email");
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const { id } = await params;
    const { action } = await req.json();
    const claim = await UpiClaimModel.findById(id);
    if (!claim || claim.status !== "pending") {
      return NextResponse.json({ error: "Claim not found or already reviewed" }, { status: 404 });
    }

    if (action === "approve") {
      const pack = COIN_PACKS.find(p => p.key === claim.packKey);
      const user = await UserModel.findById(claim.userId);
      if (!pack || !user) return NextResponse.json({ error: "Pack or user missing" }, { status: 400 });
      await recordCoins(user, pack.coins + pack.bonus, "purchase", `${pack.key} — ₹${pack.price} via UPI (ref ${claim.refNumber})`);
      await user.save();
      claim.status = "approved";
    } else {
      claim.status = "rejected";
    }
    claim.reviewedBy = email || "";
    claim.reviewedAt = new Date();
    await claim.save();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
