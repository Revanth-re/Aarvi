import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { CoinTxModel } from "@/models/CoinTx";
import { NotificationModel } from "@/models/Notification";
import { recordCoins } from "@/lib/gamificationServer";
import {
  COIN_PACKS, COINS_DAILY_CLAIM, COINS_PER_AD, MAX_ADS_PER_DAY,
  COINS_PER_INVITE, dayKey,
} from "@/lib/gamification";
import { idOf, iso } from "@/lib/serialize";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ⚠️ NO REAL MONEY IS PROCESSED IN THIS FILE.
//
// "Watch a short ad" credits coins on the client's say-so, which is
// only acceptable because these coins buy nothing outside the app. If
// you ever wire a real ad network, move this behind that network's
// server-side reward callback — otherwise anyone can mint coins with
// curl. The per-day cap below limits the damage in the meantime.
//
// Coin-pack purchases are refused unless DEMO_WALLET=true, for the same
// reason: granting currency on an unverified request is free money.
const DEMO_WALLET = process.env.DEMO_WALLET === "true";

// GET /api/coins?userId= — balance, today's limits, ledger, packs.
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const user = await UserModel.findById(userId)
      .select("coins streak lastDailyClaim adsWatchedDate adsWatchedCount").lean<any>();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const today = dayKey();
    // The ad counter carries a date, so a stale count from yesterday
    // reads as zero today without needing a nightly reset job.
    const adsToday = user.adsWatchedDate === today ? (user.adsWatchedCount ?? 0) : 0;

    const txs = await CoinTxModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean<any[]>();

    return NextResponse.json({
      coins: user.coins ?? 0,
      streak: user.streak ?? 0,
      dailyClaimed: user.lastDailyClaim === today,
      adsWatchedToday: adsToday,
      adsRemainingToday: Math.max(0, MAX_ADS_PER_DAY - adsToday),
      transactions: txs.map(t => ({
        _id: idOf(t._id), userId: t.userId, amount: t.amount, reason: t.reason,
        note: t.note || "", balanceAfter: t.balanceAfter, createdAt: iso(t.createdAt),
      })),
      packs: COIN_PACKS,
      demoMode: DEMO_WALLET,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/coins — { userId, action: "daily"|"ad"|"invite"|"buy", packKey?, inviteeId? }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId, action, packKey, inviteeId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const user = await UserModel.findById(userId);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const today = dayKey();

    // ── Daily reward ──
    if (action === "daily") {
      if (user.lastDailyClaim === today) {
        return NextResponse.json({ error: "Already claimed today", coins: user.coins ?? 0 }, { status: 409 });
      }
      user.lastDailyClaim = today;
      const balance = await recordCoins(user, COINS_DAILY_CLAIM, "daily_checkin", "Daily reward");
      await user.save();

      await NotificationModel.create({
        userId, category: "coins", type: "daily_reward",
        title: `+${COINS_DAILY_CLAIM} coins earned`,
        message: "Your daily reward has been added.",
        link: "/coins",
      }).catch(() => {});

      return NextResponse.json({ ok: true, coins: balance, granted: COINS_DAILY_CLAIM });
    }

    // ── Rewarded ad ──
    if (action === "ad") {
      const watched = user.adsWatchedDate === today ? (user.adsWatchedCount ?? 0) : 0;
      if (watched >= MAX_ADS_PER_DAY) {
        return NextResponse.json({
          error: `That's all ${MAX_ADS_PER_DAY} ads for today — come back tomorrow`,
          coins: user.coins ?? 0,
        }, { status: 429 });
      }
      user.adsWatchedDate = today;
      user.adsWatchedCount = watched + 1;
      const balance = await recordCoins(user, COINS_PER_AD, "watch_ad", "Rewarded ad");
      await user.save();

      return NextResponse.json({
        ok: true, coins: balance, granted: COINS_PER_AD,
        adsRemainingToday: MAX_ADS_PER_DAY - (watched + 1),
      });
    }

    // ── Invite payout ──
    // Credits the *inviter* once the invitee qualifies. Guarded by a
    // flag on the invitee so the bonus can't be claimed twice.
    if (action === "invite") {
      if (!inviteeId) return NextResponse.json({ error: "inviteeId is required" }, { status: 400 });

      const invitee = await UserModel.findById(inviteeId);
      if (!invitee) return NextResponse.json({ error: "Invitee not found" }, { status: 404 });
      if (invitee.inviteRewarded) {
        return NextResponse.json({ error: "Already rewarded for this invite" }, { status: 409 });
      }
      if (invitee.invitedBy !== userId) {
        return NextResponse.json({ error: "That user wasn't invited by you" }, { status: 403 });
      }

      invitee.inviteRewarded = true;
      await invitee.save();

      const balance = await recordCoins(user, COINS_PER_INVITE, "invite_friend", `Invited ${invitee.name || "a friend"}`);
      await user.save();

      return NextResponse.json({ ok: true, coins: balance, granted: COINS_PER_INVITE });
    }

    // ── Buy a pack ──
    if (action === "buy") {
      const pack = COIN_PACKS.find(p => p.key === packKey);
      if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 400 });

      if (!DEMO_WALLET) {
        return NextResponse.json({
          error: "Payments aren't connected yet",
          detail:
            "Coin purchases must be granted by a verified payment webhook — " +
            "granting them from a client request would let anyone mint coins " +
            "for free. Set DEMO_WALLET=true to try the flow with test coins.",
        }, { status: 501 });
      }

      const total = pack.coins + pack.bonus;
      const balance = await recordCoins(user, total, "purchase", `${pack.key} (demo — no payment taken)`);
      await user.save();
      return NextResponse.json({ ok: true, coins: balance, granted: total, demo: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
