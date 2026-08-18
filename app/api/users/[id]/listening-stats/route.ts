import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { ListeningLogModel } from "@/models/ListeningLog";
import { ThoughtModel } from "@/models/Thought";
import { StoryModel } from "@/models/Story";
import { dayKey, levelFromSeconds } from "@/lib/gamification";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

const DAYS = 14;

// GET /api/users/[id]/listening-stats
//
// Powers the Wrapped/stats screen: a day-by-day listening log for the
// last two weeks, plus lifetime totals and how much the person has
// posted (thoughts, stories) — the fuller "listening activity" picture
// the requirements ask for, not just minutes.
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;

    const [user, logs, thoughtCount, storyCount] = await Promise.all([
      UserModel.findById(id).select("listenSeconds streak longestStreak").lean<any>(),
      ListeningLogModel.find({ userId: id }).sort({ dayKey: -1 }).limit(DAYS).lean<any[]>(),
      ThoughtModel.countDocuments({ userId: id }),
      StoryModel.countDocuments({ userId: id }),
    ]);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Build the full last-DAYS window, oldest first, filling in zero
    // for any day with no listening — otherwise a quiet day would just
    // be a gap rather than a visible zero bar.
    const byDay = new Map(logs.map(l => [l.dayKey, l.seconds]));
    const days: { day: string; minutes: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      days.push({ day: key, minutes: Math.round((byDay.get(key) ?? 0) / 60) });
    }

    const todayMinutes = days[days.length - 1]?.minutes ?? 0;
    const weekMinutes = days.slice(-7).reduce((a, d) => a + d.minutes, 0);
    const totalMinutes = Math.round((user.listenSeconds ?? 0) / 60);
    const activeDays = days.filter(d => d.minutes > 0).length;
    const lvl = levelFromSeconds(user.listenSeconds ?? 0);

    return NextResponse.json({
      days,
      todayMinutes, weekMinutes, totalMinutes, activeDays,
      streak: user.streak ?? 0, longestStreak: user.longestStreak ?? 0,
      level: lvl.level, levelTitle: lvl.title,
      thoughtCount, storyCount,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
