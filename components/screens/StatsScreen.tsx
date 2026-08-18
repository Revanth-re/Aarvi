"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flame, Clock, TrendingUp, MessageCircle, Quote } from "lucide-react";
import { useApp } from "@/store";
import { Screen } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";

interface Stats {
  days: { day: string; minutes: number }[];
  todayMinutes: number; weekMinutes: number; totalMinutes: number; activeDays: number;
  streak: number; longestStreak: number;
  level: number; levelTitle: string;
  thoughtCount: number; storyCount: number;
}

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/users/${user._id}/listening-stats`)
      .then(r => r.json())
      .then(d => { if (!cancelled && !d.error) setStats(d); })
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
      </Screen>
    </>
  );
}

function StatCard({ icon, value, label, wide }: { icon: React.ReactNode; value: string; label: string; wide?: boolean }) {
  return (
    <div className="card" style={{ padding: wide ? "14px 12px" : "13px 6px", textAlign: wide ? "left" : "center" }}>
      <span style={{ display: "flex", justifyContent: wide ? "flex-start" : "center", color: "var(--accent)", marginBottom: 4 }}>{icon}</span>
      <span style={{ display: "block", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{value}</span>
      <span style={{ display: "block", fontSize: 10.5, color: "var(--text3)" }}>{label}</span>
    </div>
  );
}
