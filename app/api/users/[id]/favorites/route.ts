import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { SeriesModel } from "@/models/Series";
import { notifyAndPush } from "@/lib/notify";

type P = { params: Promise<{ id: string }> };

// GET: return the user's favorite series ids
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const user = await UserModel.findById(id).lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ favorites: user.favorites || [] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// POST: toggle a series id in/out of the user's favorites
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { seriesId } = await req.json();
    if (!seriesId) return NextResponse.json({ error: "seriesId is required" }, { status: 400 });

    const user = await UserModel.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const has = (user.favorites || []).includes(seriesId);
    if (has) {
      user.favorites = user.favorites.filter((s: string) => s !== seriesId);
    } else {
      user.favorites = [...(user.favorites || []), seriesId];
    }
    await user.save();

    // Notify the creator on a new save, never on un-saving, and never
    // when someone saves their own series.
    if (!has) {
      const series = await SeriesModel.findById(seriesId).select("title creatorId").lean<{ title?: string; creatorId?: string }>();
      if (series?.creatorId && series.creatorId !== id) {
        await notifyAndPush(series.creatorId, {
          type: "series_saved",
          category: "social",
          title: `${user.name || "Someone"} saved "${series.title}"`,
          message: "",
          link: `/series/${seriesId}`,
          fromUserId: id,
          fromUserName: user.name,
          toggle: "likes",
          pushUrl: `/series/${seriesId}`,
        });
      }
    }

    return NextResponse.json({ favorites: user.favorites });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
