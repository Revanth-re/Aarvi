import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { SeriesModel } from "@/models/Series";

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/episodes/unlock-ad
// Body: { userId, seriesId, episodeId }
//
// The free alternative to /api/episodes/unlock — same effect (adds
// the episode to the user's unlockedEpisodes) but costs no coins,
// used after the client's watch-an-ad flow finishes. There's no real
// ad network wired in yet (no AdMob/IMA/etc. credentials), so the
// "ad" is a client-side placeholder timer for now — this endpoint is
// the real integration point once one is: swap what the client calls
// after a real ad's reward callback fires, this route doesn't change.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, seriesId, episodeId } = await req.json();

    if (!userId || !seriesId || !episodeId) {
      return NextResponse.json(
        { error: "userId, seriesId and episodeId are required" }, { status: 400 }
      );
    }

    const series = await SeriesModel.findById(seriesId).select("episodes._id episodes.isLocked").lean<any>();
    if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

    const ep = (series.episodes || []).find((e: any) => e._id.toString() === episodeId);
    if (!ep) return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    if (!ep.isLocked) return NextResponse.json({ error: "That episode isn't locked" }, { status: 400 });

    const user = await UserModel.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const key = `${seriesId}:${episodeId}`;
    const unlocked: string[] = user.unlockedEpisodes || [];

    if (!unlocked.includes(key)) {
      user.unlockedEpisodes = [...unlocked, key];
      await user.save();
      await SeriesModel.updateOne(
        { _id: seriesId, "episodes._id": episodeId },
        { $inc: { "episodes.$.adUnlockCount": 1 } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
