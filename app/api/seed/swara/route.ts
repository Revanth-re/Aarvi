import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SeriesModel } from "@/models/Series";
import { UserModel } from "@/models/User";
import { ShortModel } from "@/models/Short";
import { StoryModel } from "@/models/Story";
import { ThoughtModel } from "@/models/Thought";
import { NotificationModel } from "@/models/Notification";
import { idOf } from "@/lib/serialize";
import { handleFrom } from "@/lib/gamification";
import {
  SEED_CREATORS, SEED_SERIES, SEED_LISTENERS, SEED_THOUGHTS,
  SEED_STORIES, SEED_SHORTS, SEED_NOTIFICATIONS,
} from "@/lib/swaraSeed";

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/seed/swara?userId=<your id>
//
// Idempotent demo seeder. Every insert is an upsert keyed on something
// stable (creator email, series title), so running it twice does not
// duplicate anything — you can re-run it safely after adding content.
//
// ⚠️ SEED CAVEAT: episodes are created with an EMPTY audioUrl. This
// seeder cannot invent licensed audio, so playback and the Shorts feed
// will have nothing to play until you attach real files via
// Admin → Audio Series. Everything else (browsing, thoughts, coins,
// streaks, search, settings) works immediately.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const viewerId = req.nextUrl.searchParams.get("userId") || "";

    // ── 1. Creators ──
    const creatorIdByName = new Map<string, string>();
    for (const c of SEED_CREATORS) {
      const doc = await UserModel.findOneAndUpdate(
        { email: c.email },
        {
          $set: { name: c.name, bio: c.bio, isCreator: true, handle: handleFrom(c.name) },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      );
      creatorIdByName.set(c.name, idOf(doc._id));
    }

    // ── 2. Listeners (authors of the seeded thoughts) ──
    const listenerIdByHandle = new Map<string, string>();
    for (const l of SEED_LISTENERS) {
      const doc = await UserModel.findOneAndUpdate(
        { email: l.email },
        { $set: { name: l.name, handle: l.handle }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true }
      );
      listenerIdByHandle.set(l.handle, idOf(doc._id));
    }

    // Give the seeded creators some followers so "Creators to follow"
    // and the follower counts aren't all zero.
    const allListenerIds = [...listenerIdByHandle.values()];
    for (const cid of creatorIdByName.values()) {
      await UserModel.updateMany(
        { _id: { $in: allListenerIds } },
        { $addToSet: { following: cid } }
      );
    }

    // ── 3. Series + episodes ──
    const seriesIdByTitle = new Map<string, any>();
    for (const s of SEED_SERIES) {
      const episodes = s.episodes.map((e, i) => ({
        title: e.title,
        description: e.description,
        duration: e.minutes * 60,
        // Empty on purpose — see the SEED CAVEAT above.
        audioUrl: "",
        episodeNumber: i + 1,
        isLocked: !!e.locked,
        transcript: "",
        playCount: 0,
      }));

      const avgMinutes = Math.round(
        s.episodes.reduce((a, e) => a + e.minutes, 0) / s.episodes.length
      );

      const existing = await SeriesModel.findOne({ title: s.title });

      const payload = {
        title: s.title, description: s.description,
        genre: s.genre, language: s.language,
        narrator: s.narratorHandle,
        creatorId: creatorIdByName.get(s.narratorHandle) || "",
        rating: s.rating, totalPlays: s.plays,
        tags: s.tags, vibes: s.vibes, avgMinutes,
        isTrending: !!s.trending, isFeatured: !!s.featured,
        totalEpisodes: episodes.length,
      };

      let doc;
      if (existing) {
        // Don't clobber episodes on re-run — you may have uploaded real
        // audio against them, and overwriting would discard it.
        Object.assign(existing, payload);
        doc = await existing.save();
      } else {
        doc = await SeriesModel.create({ ...payload, episodes });
      }
      seriesIdByTitle.set(s.title, doc);
    }

    // ── 4. Thoughts ──
    let thoughtsAdded = 0;
    for (const t of SEED_THOUGHTS) {
      const series = seriesIdByTitle.get(t.series);
      const authorId = listenerIdByHandle.get(t.author);
      if (!series || !authorId) continue;

      const ep = (series.episodes || [])[t.episode - 1];
      if (!ep) continue;

      const exists = await ThoughtModel.findOne({ userId: authorId, text: t.text });
      if (exists) continue;

      // Spread the fake like counts across the seeded listeners so the
      // counts are backed by a real likedBy set rather than a bare number.
      const likers = allListenerIds.filter(id => id !== authorId);

      await ThoughtModel.create({
        userId: authorId,
        seriesId: idOf(series._id),
        episodeId: idOf(ep._id),
        atSec: t.at,
        text: t.text,
        likedBy: likers,
        isPublic: true,
      });
      thoughtsAdded++;
    }

    // ── 5. Stories ──
    let storiesAdded = 0;
    for (const s of SEED_STORIES) {
      const uid = creatorIdByName.get(s.author);
      if (!uid) continue;
      const exists = await StoryModel.findOne({ userId: uid, caption: s.caption });
      if (exists) continue;
      await StoryModel.create({ userId: uid, kind: s.kind, caption: s.caption, mediaUrl: "" });
      storiesAdded++;
    }

    // ── 6. Shorts ──
    let shortsAdded = 0;
    for (const sh of SEED_SHORTS) {
      const series = seriesIdByTitle.get(sh.series);
      if (!series) continue;
      const ep = (series.episodes || [])[sh.episode - 1];
      if (!ep) continue;

      const exists = await ShortModel.findOne({ seriesId: idOf(series._id), caption: sh.caption });
      if (exists) continue;

      await ShortModel.create({
        seriesId: idOf(series._id),
        episodeId: idOf(ep._id),
        startSec: sh.start, endSec: sh.end,
        caption: sh.caption, hook: sh.hook,
        creatorId: creatorIdByName.get(sh.creator) || "",
        creatorHandle: "@" + handleFrom(sh.creator),
      });
      shortsAdded++;
    }

    // ── 7. Notifications for the person running the seed ──
    let notifsAdded = 0;
    if (viewerId) {
      for (const n of SEED_NOTIFICATIONS) {
        const exists = await NotificationModel.findOne({ userId: viewerId, title: n.title });
        if (exists) continue;
        await NotificationModel.create({
          userId: viewerId, category: n.category, type: n.type,
          title: n.title, message: n.message, link: "/",
          createdAt: new Date(Date.now() - n.hoursAgo * 3600_000),
        });
        notifsAdded++;
      }
      // Follow the seeded creators so Discover's "Following" strip and
      // the story rail have something in them straight away.
      await UserModel.findByIdAndUpdate(viewerId, {
        $addToSet: { following: { $each: [...creatorIdByName.values()] } },
      });
    }

    return NextResponse.json({
      ok: true,
      creators: creatorIdByName.size,
      listeners: listenerIdByHandle.size,
      series: seriesIdByTitle.size,
      thoughtsAdded, storiesAdded, shortsAdded, notifsAdded,
      note: "Episodes were created without audio files — attach real audio in Admin → Audio Series before playback will work.",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
