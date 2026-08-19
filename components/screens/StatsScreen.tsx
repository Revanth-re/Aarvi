"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flame, Clock, TrendingUp, MessageCircle, Quote, Headphones } from "lucide-react";
import { DnaSlice, Thought } from "@/types";
import { useApp } from "@/store";
import { Screen, SectionHeader, Cover } from "@/components/kit";
import TopBar, { CoinGlyph } from "@/components/shell/TopBar";
import ThoughtCard from "./ThoughtCard";

interface Stats {
  days: { day: string; minutes: number }[];
  todayMinutes: number; weekMinutes: number; totalMinutes: number; activeDays: number;
  streak: number; longestStreak: number;
  level: number; levelTitle: string;
  thoughtCount: number; storyCount: number;
}
interface RecentItem { _id: string; title: string; coverImage: string; }

function formatDayLabel(dayKey: string): string {
  // dayKey is YYYY-MM-DD (see lib/gamification.ts) — display as a
  // short weekday initial, which is all that fits under a slim bar.
  const d = new Date(`${dayKey}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "narrow" });
}

export default function StatsScreen() {
  const router = useRouter();
  const user = useApp(s => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [game, setGame] = useState<{ coins: number; showCount: number } | null>(null);
  const [dna, setDna] = useState<DnaSlice[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/users/${user._id}/listening-stats`).then(r => r.json()),
      fetch(`/api/users/${user._id}/gamification`).then(r => r.json()),
      fetch(`/api/users/${user._id}/dna`).then(r => r.json()),
      fetch(`/api/thoughts?userId=${user._id}&authorId=${user._id}&limit=10`).then(r => r.json()),
    ])
      .then(([s, g, d, t]) => {
        if (cancelled) return;
        if (!s.error) setStats(s);
        if (!g.error) setGame(g);
        if (Array.isArray(d.dna)) setDna(d.dna);
        if (Array.isArray(d.recent)) setRecent(d.recent);
        if (Array.isArray(t)) setThoughts(t);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [user?._id]);

  const back = (
    <button onClick={() => router.back()} aria-label="Back"
      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 0 }}>
      <ArrowLeft size={20}/>
    </button>
  );

  if (!user) {
    return (
      <>
        <TopBar title="Listening stats"/>
        <Screen>{back}<p style={{ color: "var(--text3)", fontSize: 13 }}>Log in to see your listening stats.</p></Screen>
      </>
    );
  }
  if (!loaded || !stats) {
    return (
      <>
        <TopBar title="Listening stats"/>
        <Screen>{back}<div className="skeleton" style={{ height: 220, borderRadius: 20 }}/></Screen>
      </>
    );
  }

  const maxMinutes = Math.max(1, ...stats.days.map(d => d.minutes));
  const last7 = stats.days.slice(-7);

  return (
    <>
      <TopBar title="Listening stats"/>
      <Screen>
        {back}

        <div style={{ background: "var(--grad)", borderRadius: "var(--r-lg)", padding: 20, color: "#fff" }}>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 21, fontWeight: 800, margin: "0 0 4px" }}>
            Your listening, wrapped
          </h1>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.88)", margin: 0 }}>
            Level {stats.level} · {stats.levelTitle}
          </p>
        </div>

        {/* Moved here from the main Profile page — these are all
            listening-related tallies, so they live alongside the rest
            of the stats now instead of cluttering the profile header. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          <Link href="/coins" className="card" style={tileStyle}>
            <span style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: 4 }}><CoinGlyph size={15}/></span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{game ? game.coins.toLocaleString() : "—"}</span>
            <span style={{ display: "block", fontSize: 10, color: "var(--text3)" }}>Coins</span>
          </Link>
          <div className="card" style={tileStyle}>
            <span style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: 4 }}><Flame size={15}/></span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{stats.streak}</span>
            <span style={{ display: "block", fontSize: 10, color: "var(--text3)" }}>Streak</span>
          </div>
          <Link href="/library" className="card" style={tileStyle}>
            <span style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: 4 }}><Headphones size={15}/></span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{game ? game.showCount : "—"}</span>
            <span style={{ display: "block", fontSize: 10, color: "var(--text3)" }}>Shows</span>
          </Link>
          <div className="card" style={tileStyle}>
            <span style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: 4 }}><MessageCircle size={15}/></span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{stats.thoughtCount}</span>
            <span style={{ display: "block", fontSize: 10, color: "var(--text3)" }}>Thoughts</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          <StatCard icon={<Clock size={15}/>} value={`${stats.todayMinutes}m`} label="Today"/>
          <StatCard icon={<TrendingUp size={15}/>} value={`${stats.weekMinutes}m`} label="This week"/>
          <StatCard icon={<Flame size={15}/>} value={String(stats.streak)} label="Day streak"/>
        </div>

        <section>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Last 7 days</div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
              {last7.map(d => (
                <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <div style={{
                    width: "100%", maxWidth: 22, borderRadius: 6,
                    height: `${Math.max(4, (d.minutes / maxMinutes) * 72)}px`,
                    background: d.minutes > 0 ? "var(--grad)" : "var(--surface2)",
                  }}/>
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>{formatDayLabel(d.day)}</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text3)", margin: "8px 2px 0" }}>
            Active {stats.activeDays} of the last 14 days · {Math.round(stats.totalMinutes / 60)} hours total, all time
          </p>
        </section>

        <section>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Activity</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StatCard icon={<MessageCircle size={15}/>} value={String(stats.thoughtCount)} label="Thoughts posted" wide/>
            <StatCard icon={<Quote size={15}/>} value={String(stats.storyCount)} label="Stories & notes" wide/>
          </div>
        </section>

        <section>
          <SectionHeader title="Listening DNA"/>
          <div className="card" style={{ padding: 16 }}>
            {dna.length ? dna.map(d => (
              <div key={d.genre} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{d.genre}</span>
                  <span style={{ color: "var(--text3)" }}>{d.percent}%</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${d.percent}%` }}/></div>
              </div>
            )) : (
              <p style={{ fontSize: 12.5, color: "var(--text3)", margin: 0, lineHeight: 1.6 }}>
                Listen to a few episodes and your genre breakdown appears here.
                It&apos;s weighted by time actually listened, not by what you saved.
              </p>
            )}
          </div>
        </section>

        {!!recent.length && (
          <section>
            <SectionHeader title="Recently played"/>
            <div className="rail">
              {recent.map(r => (
                <Link key={r._id} href={`/series/${r._id}`} style={{ flex: "none", textDecoration: "none", width: 76 }}>
                  <Cover id={r._id} url={r.coverImage} size={76} radius={16}/>
                  <span className="truncate" style={{ display: "block", fontSize: 10.5, color: "var(--text3)", marginTop: 6, textAlign: "center" }}>
                    {r.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Your thoughts" href="/library"/>
          {thoughts.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {thoughts.map(t => (
                <ThoughtCard key={t._id} thought={t}
                  onDeleted={id => setThoughts(prev => prev.filter(x => x._id !== id))}/>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--text3)" }}>
              Nothing yet — pin one from the player while you listen.
            </p>
          )}
        </section>
      </Screen>
    </>
  );
}

const tileStyle: React.CSSProperties = { padding: "13px 6px", textAlign: "center", textDecoration: "none", display: "block" };

function StatCard({ icon, value, label, wide }: { icon: React.ReactNode; value: string; label: string; wide?: boolean }) {
  return (
    <div className="card" style={{ padding: wide ? "14px 12px" : "13px 6px", textAlign: wide ? "left" : "center" }}>
      <span style={{ display: "flex", justifyContent: wide ? "flex-start" : "center", color: "var(--accent)", marginBottom: 4 }}>{icon}</span>
      <span style={{ display: "block", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{value}</span>
      <span style={{ display: "block", fontSize: 10.5, color: "var(--text3)" }}>{label}</span>
    </div>
  );
}
