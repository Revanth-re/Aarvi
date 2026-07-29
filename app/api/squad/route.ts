import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SquadModel } from "@/models/Squad";
import { UserModel } from "@/models/User";
import { recordCoins } from "@/lib/gamificationServer";
import { dayKey, previousDayKey, SQUAD_BONUS_COINS } from "@/lib/gamification";
import { SquadView, SquadMemberView } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_MEMBERS = 8;

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous glyphs
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Read a checkins Map entry whether it came from a doc or .lean(). */
function checkinsFor(squad: any, day: string): string[] {
  const c = squad.checkins;
  if (!c) return [];
  if (c instanceof Map) return c.get(day) ?? [];
  return c[day] ?? [];
}

/**
 * Evaluate the squad's shared streak for a given day.
 *
 * The rule: the streak only survives a day on which EVERY member
 * checked in. It's evaluated lazily (on read) rather than by a cron
 * job, and guarded by `lastEvaluated` so it runs at most once per
 * calendar day no matter how often the endpoint is hit.
 */
async function evaluateStreak(squad: any, today: string): Promise<void> {
  if (squad.lastEvaluated === today) return;

  const members: string[] = squad.memberIds || [];
  const yesterday = previousDayKey(today);

  if (squad.lastEvaluated && squad.lastEvaluated !== yesterday) {
    // A whole day passed with no evaluation at all — nobody opened the
    // app, so the streak is broken regardless of who listened.
    squad.streak = 0;
  } else if (squad.lastEvaluated === yesterday) {
    const done = checkinsFor(squad, yesterday);
    const everyone = members.length > 0 && members.every(m => done.includes(m));
    squad.streak = everyone ? (squad.streak ?? 0) + 1 : 0;
    squad.longestStreak = Math.max(squad.longestStreak ?? 0, squad.streak);
  }

  squad.lastEvaluated = today;
  await squad.save();
}

async function buildView(squad: any, viewerId: string, today: string): Promise<SquadView> {
  const memberIds: string[] = squad.memberIds || [];
  const done = checkinsFor(squad, today);

  const users = await UserModel.find({ _id: { $in: memberIds } })
    .select("name image").lean<any[]>();
  const byId = new Map(users.map(u => [u._id.toString(), u]));

  const members: SquadMemberView[] = memberIds.map(id => {
    const u = byId.get(id);
    return {
      userId: id,
      name: u?.name || "Listener",
      image: u?.image || "",
      checkedIn: done.includes(id),
    };
  });

  return {
    _id: squad._id.toString(),
    name: squad.name,
    ownerId: squad.ownerId,
    goalMinutes: squad.goalMinutes ?? 10,
    streak: squad.streak ?? 0,
    longestStreak: squad.longestStreak ?? 0,
    members,
    checkedInToday: done.includes(viewerId),
    allCheckedIn: members.length > 0 && members.every(m => m.checkedIn),
  };
}

// GET /api/squad?userId=<id> — the caller's squad, or null.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const squad = await SquadModel.findOne({ memberIds: userId });
    if (!squad) return NextResponse.json({ squad: null });

    const today = dayKey();
    await evaluateStreak(squad, today);

    return NextResponse.json({ squad: await buildView(squad, userId, today) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/squad — create / join / leave / check in.
// Body: { action: "create"|"join"|"leave"|"checkin", userId, name?, code? }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { action, userId, name, code } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const today = dayKey();

    // ── create ──
    if (action === "create") {
      const existing = await SquadModel.findOne({ memberIds: userId });
      if (existing) return NextResponse.json({ error: "You're already in a squad" }, { status: 409 });

      const squad = await SquadModel.create({
        name: (name || "My Squad").slice(0, 40),
        ownerId: userId,
        code: genCode(),
        memberIds: [userId],
        lastEvaluated: today,
      });
      await UserModel.findByIdAndUpdate(userId, { squadId: squad._id.toString() });

      return NextResponse.json({
        squad: await buildView(squad, userId, today),
        code: squad.code,
      }, { status: 201 });
    }

    // ── join ──
    if (action === "join") {
      if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

      const squad = await SquadModel.findOne({ code: String(code).toUpperCase() });
      if (!squad) return NextResponse.json({ error: "No squad with that code" }, { status: 404 });

      const members: string[] = squad.memberIds || [];
      if (members.includes(userId)) {
        return NextResponse.json({ squad: await buildView(squad, userId, today) });
      }
      if (members.length >= MAX_MEMBERS) {
        return NextResponse.json({ error: `Squads cap at ${MAX_MEMBERS} people` }, { status: 409 });
      }

      squad.memberIds = [...members, userId];
      await squad.save();
      await UserModel.findByIdAndUpdate(userId, { squadId: squad._id.toString() });

      return NextResponse.json({ squad: await buildView(squad, userId, today) });
    }

    // ── leave ──
    if (action === "leave") {
      const squad = await SquadModel.findOne({ memberIds: userId });
      if (!squad) return NextResponse.json({ squad: null });

      squad.memberIds = (squad.memberIds || []).filter((m: string) => m !== userId);
      await UserModel.findByIdAndUpdate(userId, { $unset: { squadId: "" } });

      // Last one out closes the door, so we don't accumulate ghost
      // squads that can still be joined by their old code.
      if (squad.memberIds.length === 0) await squad.deleteOne();
      else await squad.save();

      return NextResponse.json({ squad: null });
    }

    // ── checkin ──
    if (action === "checkin") {
      const squad = await SquadModel.findOne({ memberIds: userId });
      if (!squad) return NextResponse.json({ error: "You're not in a squad" }, { status: 404 });

      await evaluateStreak(squad, today);

      const done = checkinsFor(squad, today);
      let bonusPaid = false;

      if (!done.includes(userId)) {
        const updated = [...done, userId];
        squad.checkins.set(today, updated);

        // The moment the last member checks in, everyone gets paid —
        // and `allCheckedIn` can only become true once per day, so the
        // bonus can't be farmed by leaving and rejoining.
        const members: string[] = squad.memberIds || [];
        if (members.every(m => updated.includes(m))) {
          bonusPaid = true;
          for (const m of members) {
            const u = await UserModel.findById(m);
            if (!u) continue;
            await recordCoins(u, SQUAD_BONUS_COINS, "squad_bonus", `${squad.name} — full squad day`);
            await u.save();
          }
        }
        await squad.save();
      }

      return NextResponse.json({
        squad: await buildView(squad, userId, today),
        bonusPaid,
        bonusCoins: bonusPaid ? SQUAD_BONUS_COINS : 0,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
