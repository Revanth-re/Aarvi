import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {};
    if (p.get("genre") && p.get("genre") !== "All") q.genre = p.get("genre");
    if (p.get("featured") === "true") q.isFeatured = true;
    if (p.get("trending") === "true") q.isTrending = true;
    if (p.get("search")) {
      const rx = new RegExp(p.get("search")!, "i");
      q.$or = [{ title: rx }, { description: rx }, { tags: { $in: [rx] } }];
    }
    const limit = parseInt(p.get("limit") || "50");
    const data = await SeriesModel.find(q).select("-episodes.transcript").limit(limit).lean();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const body = await req.json();
    const doc = await SeriesModel.create({ ...body, totalEpisodes: body.episodes?.length || 0 });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
