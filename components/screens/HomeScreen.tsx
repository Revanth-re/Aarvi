"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Headphones, MessageCircle } from "lucide-react";
import { Series, Thought } from "@/types";
import { useApp, usePlayer, useToast } from "@/store";
import { DAILY_GOAL_MINUTES } from "@/lib/gamification";
import { Screen, SectionHeader, ShowCard, ShowCardSkeleton, Cover, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import StoryRail from "./StoryRail";
import ThoughtCard from "./ThoughtCard";

interface ContinueRow {
  series: Series; episodeId: string; episodeTitle: string;
  position: number; percent: number;
}
interface HomeData {
  continue: ContinueRow[];
  trending: Series[];
  underTen: Series[];
  streak: number;
  goal: { minutes: number; coins: number; met: boolean; freeEpisodeAt: number };
}

export default function HomeScreen() {
  const user = useApp(s => s.user);
  const setEp = usePlayer(s => s.setEp);
  const requestSeek = usePlayer(s => s.requestSeek);
  const showToast = useToast(s => s.show);

  const [data, setData] = useState<HomeData | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const qs = user ? `?userId=${user._id}` : "";

    Promise.all([
      fetch(`/api/home${qs}`).then(r => r.json()),
      fetch(`/api/thoughts${qs ? qs + "&" : "?"}limit=6`).then(r => r.json()),
    ])
      .then(([h, t]) => {
        if (cancelled) return;
        if (!h.error) setData(h);
        if (Array.isArray(t)) setThoughts(t);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user?._id]);

  const resume = async (row: ContinueRow) => {
    const target = row.series.episodes?.find(e => e._id === row.episodeId) ?? row.series.episodes?.[0];
    if (!target) { showToast("That episode is no longer available", "error"); return; }
    setEp(target, row.series);
    // Pick up exactly where they paused — that's the promise the
    // section header makes.
    if (row.position > 0) requestSeek(row.position);
  };

  const goal = data?.goal;

  return (
    <>
      <TopBar title="SWARA FM" wordmark/>
      <Screen>
        <StoryRail/>

        {/* ── Daily goal strip ── */}
        {goal && (
          <Link href="/coins" style={{
            display: "flex", alignItems: "center", gap: 12, textDecoration: "none",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--r)", padding: "12px 14px",
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: 10, flex: "none",
              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
            }}>
              <Sparkles size={16}/>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                {goal.met
                  ? `Today's ${DAILY_GOAL_MINUTES} min done · +${goal.coins} coins`
                  : `Listen ${goal.minutes} min today → +${goal.coins} coins`}
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>
                Streak day {data?.streak ?? 0} · unlocks a free episode at day {goal.freeEpisodeAt}
              </span>
            </span>
            <span className="btn btn-primary btn-xs" style={{ flex: "none" }}>
              {goal.met ? "Claim" : "Earn"}
            </span>
          </Link>
        )}

        {/* ── Continue listening ── */}
        {!!data?.continue.length && (
          <section>
            <SectionHeader title="Continue listening" sub="Picks up exactly where you paused"/>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.continue.map(row => (
                <button key={row.series._id + row.episodeId} onClick={() => resume(row)}
                  className="card"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, cursor: "pointer", textAlign: "left", width: "100%" }}>
                  <Cover id={row.series._id} url={row.series.coverImage} size={52} radius={11}/>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="truncate" style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                      {row.series.title}
                    </span>
                    <span className="truncate" style={{ display: "block", fontSize: 11.5, color: "var(--text3)", marginBottom: 6 }}>
                      {row.series.genre}
                    </span>
                    <span className="progress-track" style={{ display: "block" }}>
                      <span className="progress-fill" style={{ display: "block", width: `${row.percent}%` }}/>
                    </span>
                  </span>
                  <Headphones size={18} color="var(--accent)" style={{ flex: "none" }}/>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Trending ── */}
        <section>
          <SectionHeader title="Trending on SWARA" sub="What everyone is bingeing right now" href="/discover"/>
          <div className="rail">
            {loading
              ? [0, 1, 2].map(i => <ShowCardSkeleton key={i}/>)
              : data?.trending.length
                ? data.trending.map(s => <ShowCard key={s._id} series={s}/>)
                : <EmptyRail/>}
          </div>
        </section>

        {/* ── Under 10 minutes ── */}
        <section>
          <SectionHeader title="Under 10 minutes" sub="Perfect for the commute" href="/discover"/>
          <div className="rail">
            {loading
              ? [0, 1, 2].map(i => <ShowCardSkeleton key={i}/>)
              : data?.underTen.length
                ? data.underTen.map(s => <ShowCard key={s._id} series={s}/>)
                : <EmptyRail/>}
          </div>
        </section>

        {/* ── Thoughts ── */}
        <section>
          <SectionHeader
            title="Thoughts"
            sub="Timestamped notes listeners left inside episodes"
            icon={<MessageCircle size={16} color="var(--accent)"/>}
          />
          {thoughts.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {thoughts.map(t => <ThoughtCard key={t._id} thought={t}/>)}
            </div>
          ) : (
            <EmptyState
              icon={<MessageCircle size={22}/>}
              title="No thoughts yet"
              body="Play any episode and tap “Leave a thought” in the player to pin a note to the exact second that got you."
            />
          )}
        </section>
      </Screen>
    </>
  );
}

function EmptyRail() {
  return (
    <p style={{ fontSize: 12.5, color: "var(--text3)", padding: "16px 2px" }}>
      Nothing here yet — seed the demo catalog from Admin, or add a series.
    </p>
  );
}
