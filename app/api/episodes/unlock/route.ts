import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { SeriesModel } from "@/models/Series";
import { recordCoins } from "@/lib/gamificationServer";
import { UNLOCK_EPISODE_COST } from "@/lib/gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/episodes/unlock
// Body: { userId, seriesId, episodeId }
//
// Spends coins to unlock one locked episode for one user. The unlock is
// recorded on the USER (not on the episode) — flipping `isLocked` on
// the series document would unlock it for everybody, which is the
// obvious bug to avoid here.
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

    // Already paid for — return success without charging again, so a
    // retried request can't double-charge.
    if (unlocked.includes(key)) {
      return NextResponse.json({ ok: true, alreadyUnlocked: true, coins: user.coins ?? 0 });
    }

    if ((user.coins ?? 0) < UNLOCK_EPISODE_COST) {
      return NextResponse.json({
        error: "Not enough coins",
        needed: UNLOCK_EPISODE_COST,
        coins: user.coins ?? 0,
      }, { status: 402 });
    }

    user.unlockedEpisodes = [...unlocked, key];
    const balance = await recordCoins(user, -UNLOCK_EPISODE_COST, "unlock_episode", key);
    await user.save();

    return NextResponse.json({ ok: true, coins: balance, cost: UNLOCK_EPISODE_COST });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
