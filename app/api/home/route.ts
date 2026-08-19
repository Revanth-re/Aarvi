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

    const [trending, underTenSource] = await Promise.all([
      SeriesModel.find({ isDraft: { $ne: true } }).select(lean).sort({ isTrending: -1, totalPlays: -1 }).limit(10).lean<any[]>(),
      // Computed live from each series' own episodes rather than
      // trusting the cached Series.avgMinutes field — that field is
      // only ever refreshed on a subsequent create/edit (see
      // app/api/series/route.ts), so any series published before that
      // logic existed would silently and permanently never qualify
      // here even with genuinely short episodes. Plain find() + JS
      // math rather than an aggregation pipeline — no live MongoDB
      // available to verify aggregation syntax against here, and a
      // silently-wrong pipeline stage fails exactly like this: an
      // empty rail with no error. Ordinary array methods have no such
      // ambiguity.
      SeriesModel.find({ isDraft: { $ne: true } }).select(lean).lean<any[]>(),
    ]);

    const underTen = underTenSource
      .map(s => {
        const durations = (s.episodes || [])
          .filter((e: any) => (e.duration || 0) > 0 && !e.isDraft)
          .map((e: any) => e.duration as number);
        if (!durations.length) return null;
        const avgMinutes = Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length / 60);
        return avgMinutes > 0 && avgMinutes <= SHORT_EPISODE_MAX_MINUTES ? s : null;
      })
      .filter((s): s is any => s !== null)
      .sort((a: any, b: any) => (b.totalPlays ?? 0) - (a.totalPlays ?? 0))
      .slice(0, 10);

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
