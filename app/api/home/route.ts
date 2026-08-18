import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { ProgressModel } from "@/models/Progress";
import { UserModel } from "@/models/User";
import { idOf } from "@/lib/serialize";
import { DAILY_GOAL_MINUTES, DAILY_GOAL_COINS, FREE_EPISODE_AT_STREAK, dayKey } from "@/lib/gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SHORT_EPISODE_MAX_MINUTES = 10;

// GET /api/home?userId=
//
// The Home screen is four rails plus a streak strip. Serving them from
// one endpoint keeps the screen from popping in section by section as
// four separate requests resolve at different times.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId") || "";

    const lean = "-episodes.transcript -episodes.transcriptSegments";

    const [trending, underTen] = await Promise.all([
      SeriesModel.find({ isDraft: { $ne: true } }).select(lean).sort({ isTrending: -1, totalPlays: -1 }).limit(10).lean<any[]>(),
      // Computed live from each series' own episodes rather than
      // trusting the cached Series.avgMinutes field — that field is
      // only ever refreshed on a subsequent create/edit (see
      // app/api/series/route.ts), so any series published before that
      // logic existed would silently and permanently never qualify
      // here even with genuinely short episodes. This can't go stale.
      SeriesModel.aggregate([
        { $match: { isDraft: { $ne: true } } },
        { $addFields: {
            _shortDurs: {
              $filter: {
                input: "$episodes", as: "e",
                cond: { $and: [{ $gt: ["$$e.duration", 0] }, { $ne: ["$$e.isDraft", true] }] },
              },
            },
        } },
        { $addFields: {
            _avgMinutes: {
              $cond: [
                { $gt: [{ $size: "$_shortDurs" }, 0] },
                { $round: [{ $divide: [{ $avg: "$_shortDurs.duration" }, 60] }, 0] },
                0,
              ],
            },
        } },
        { $match: { _avgMinutes: { $gt: 0, $lte: SHORT_EPISODE_MAX_MINUTES } } },
        { $sort: { totalPlays: -1 } },
        { $limit: 10 },
        { $project: { "episodes.transcript": 0, "episodes.transcriptSegments": 0, _shortDurs: 0, _avgMinutes: 0 } },
      ]) as Promise<any[]>,
    ]);

    // ── Continue listening ──
    // Driven by the Progress records the player already writes, so it
    // reflects genuine recency rather than guessing from favourites.
    let continueRows: any[] = [];
    let streak = 0, coins = 0, goalMet = false;

    if (userId) {
      const [progress, user] = await Promise.all([
        ProgressModel.find({ userId }).sort({ updatedAt: -1 }).limit(6).lean<any[]>(),
        UserModel.findById(userId).select("streak coins lastListenDate").lean<any>(),
      ]);

      streak = user?.streak ?? 0;
      coins = user?.coins ?? 0;
      goalMet = user?.lastListenDate === dayKey();

      if (progress.length) {
        const series = await SeriesModel
          .find({ _id: { $in: progress.map(p => p.seriesId) } })
          .select(lean).lean<any[]>();
        const byId = new Map(series.map(s => [idOf(s._id), s]));

        continueRows = progress
          .map(p => {
            const s = byId.get(p.seriesId);
            if (!s) return null;   // series deleted — drop the row

            const ep = (s.episodes || []).find((e: any) => idOf(e._id) === p.episodeId);
            const duration = ep?.duration || 0;
            return {
              series: { ...s, _id: idOf(s._id) },
              episodeId: p.episodeId,
              episodeTitle: ep?.title || "",
              position: p.position ?? 0,
              // Guard the divide: a duration of 0 would produce NaN and
              // render a broken progress bar.
              percent: duration > 0
                ? Math.min(100, Math.round(((p.position ?? 0) / duration) * 100))
                : 0,
            };
          })
          .filter(Boolean);
      }
    }

    return NextResponse.json({
      continue: continueRows,
      trending: trending.map(s => ({ ...s, _id: idOf(s._id) })),
      underTen: underTen.map(s => ({ ...s, _id: idOf(s._id) })),
      streak,
      coins,
      goal: {
        minutes: DAILY_GOAL_MINUTES,
        coins: DAILY_GOAL_COINS,
        met: goalMet,
        freeEpisodeAt: FREE_EPISODE_AT_STREAK,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
