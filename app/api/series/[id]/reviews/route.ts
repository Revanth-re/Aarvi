import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ReviewModel } from "@/models/Review";
import { SeriesModel } from "@/models/Series";
import { UserModel } from "@/models/User";
import { idOf, iso, publicUser } from "@/lib/serialize";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// Recomputes and caches the series' rating/ratingCount from the real
// Review documents — called after every write so Discover/Home, which
// read Series.rating directly, don't need to join reviews themselves.
async function recomputeRating(seriesId: string) {
  const agg = await ReviewModel.aggregate([
    { $match: { seriesId } },
    { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);
  const avg = agg[0]?.avg ?? 4.5;
  const count = agg[0]?.count ?? 0;
  await SeriesModel.findByIdAndUpdate(seriesId, {
    rating: count ? Math.round(avg * 10) / 10 : 4.5,
    ratingCount: count,
  });
  return { avg: count ? Math.round(avg * 10) / 10 : 4.5, count };
}

// GET /api/series/[id]/reviews?userId=  → { avg, count, reviews, myReview }
export async function GET(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const me = req.nextUrl.searchParams.get("userId") || "";

    const rows = await ReviewModel.find({ seriesId: id }).sort({ createdAt: -1 }).limit(50).lean<any[]>();
    const agg = await ReviewModel.aggregate([
      { $match: { seriesId: id } },
      { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
    ]);
    const avg = agg[0]?.count ? Math.round(agg[0].avg * 10) / 10 : 4.5;
    const count = agg[0]?.count ?? 0;

    const users = await UserModel.find({ _id: { $in: [...new Set(rows.map(r => r.userId))] } })
      .select("name handle image").lean<any[]>();
    const byId = new Map(users.map(u => [idOf(u._id), u]));

    const reviews = rows.filter(r => byId.has(r.userId)).map(r => {
      const u = publicUser(byId.get(r.userId));
      return {
        _id: idOf(r._id), seriesId: r.seriesId,
        userId: r.userId, userName: u.name, userHandle: u.handle, userImage: u.image,
        stars: r.stars, text: r.text, createdAt: iso(r.createdAt),
      };
    });

    const myReview = me ? reviews.find(r => r.userId === me) ?? null : null;

    return NextResponse.json({ avg, count, reviews, myReview });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/series/[id]/reviews — Body: { userId, stars, text? }
// Upserts: posting again with the same userId replaces your previous
// rating/review for this series rather than adding a second one.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId, stars, text } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const n = Number(stars);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return NextResponse.json({ error: "stars must be 1-5" }, { status: 400 });
    }

    const series = await SeriesModel.findById(id).select("_id").lean();
    if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

    await ReviewModel.findOneAndUpdate(
      { seriesId: id, userId },
      { $set: { stars: n, text: String(text ?? "").trim().slice(0, 800), updatedAt: new Date() },
        $setOnInsert: { seriesId: id, userId, createdAt: new Date() } },
      { upsert: true }
    );

    const { avg, count } = await recomputeRating(id);
    return NextResponse.json({ avg, count }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
