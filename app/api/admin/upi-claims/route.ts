import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UpiClaimModel } from "@/models/UpiClaim";
import { UserModel } from "@/models/User";
import { requireAdmin } from "@/lib/requireAdmin";
import { idOf, iso } from "@/lib/serialize";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const claims = await UpiClaimModel.find({ status: "pending" }).sort({ createdAt: 1 }).lean<any[]>();
    const users = await UserModel.find({ _id: { $in: claims.map(c => c.userId) } }).select("name handle").lean<any[]>();
    const byId = new Map(users.map(u => [idOf(u._id), u]));
    return NextResponse.json(claims.map(c => ({
      _id: idOf(c._id), userId: c.userId,
      userName: byId.get(c.userId)?.name || "Unknown",
      userHandle: byId.get(c.userId)?.handle || "",
      packKey: c.packKey, amount: c.amount, refNumber: c.refNumber, createdAt: iso(c.createdAt),
    })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
