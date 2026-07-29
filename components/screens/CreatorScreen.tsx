"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic, Users, Headphones, TrendingUp, Plus, Clapperboard, Pencil } from "lucide-react";
import { Series } from "@/types";
import { useApp } from "@/store";
import { formatCount } from "@/lib/gamification";
import { Screen, SectionHeader, Cover, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";

export default function CreatorScreen() {
  const user = useApp(s => s.user);
  const [series, setSeries] = useState<Series[]>([]);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetch(`/api/series?creatorId=${user._id}&limit=50`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d)) setSeries(d); })
      .catch(() => {});

    fetch(`/api/users/${user._id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && typeof d.followerCount === "number") setFollowers(d.followerCount); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?._id]);

  if (!user) {
    return (
      <>
        <TopBar title="Creator Studio"/>
        <Screen>
          <EmptyState icon={<Mic size={22}/>} title="Log in to open Creator Studio"
            body="Creator Studio shows the performance of series you publish."
            cta={{ href: "/login", label: "Log in" }}/>
        </Screen>
      </>
    );
  }

  const totalPlays = series.reduce((a, s) => a + (s.totalPlays ?? 0), 0);
  const totalEpisodes = series.reduce((a, s) => a + (s.totalEpisodes ?? s.episodes?.length ?? 0), 0);

  return (
    <>
      <TopBar title="Creator Studio"/>
      <Screen>
        <div style={{ background: "var(--grad)", borderRadius: "var(--r-lg)", padding: 20, color: "#fff" }}>
          <Mic size={22}/>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 22, fontWeight: 800, margin: "10px 0 4px" }}>
            Creator Studio
          </h1>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.88)", margin: 0, lineHeight: 1.5 }}>
            Turn your story into audio. Track how it lands.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          <Metric icon={<Headphones size={15}/>} value={formatCount(totalPlays)} label="Plays"/>
          <Metric icon={<Users size={15}/>} value={formatCount(followers)} label="Followers"/>
          <Metric icon={<TrendingUp size={15}/>} value={String(totalEpisodes)} label="Episodes"/>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/creator/new" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}>
            <Plus size={14}/>New series
          </Link>
          <Link href="/creator/shorts/new" className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}>
            <Clapperboard size={14}/>Cut a Short
          </Link>
        </div>

        <section>
          <SectionHeader title="Your series"/>
          {series.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {series.map(s => (
                <div key={s._id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 10 }}>
                  <Link href={`/series/${s._id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none" }}>
                    <Cover id={s._id} url={s.coverImage} size={52} radius={12}/>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="truncate" style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                        {s.title}
                      </span>
                      <span className="truncate" style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>
                        {formatCount(s.totalPlays ?? 0)} plays · {s.totalEpisodes ?? s.episodes?.length ?? 0} episodes
                      </span>
                    </span>
                  </Link>
                  <Link href={`/creator/series/${s._id}/edit`} className="btn btn-ghost btn-xs" style={{ textDecoration: "none" }}>
                    <Pencil size={12}/>Edit
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Plus size={22}/>}
              title="You haven't published anything yet"
              body="Publish a series with at least one episode and it'll show up here with its play counts — no admin approval needed."
              cta={{ href: "/creator/new", label: "Publish a series" }}
            />
          )}
        </section>

        <p style={{ fontSize: 11.5, color: "var(--text3)", lineHeight: 1.6 }}>
          Recording and AI voice tools aren&apos;t built — upload finished audio
          files and Creator Studio handles the rest (cover art, episodes, Shorts).
        </p>
      </Screen>
    </>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card" style={{ padding: "13px 8px", textAlign: "center" }}>
      <span style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: 4 }}>{icon}</span>
      <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{value}</span>
      <span style={{ display: "block", fontSize: 10, color: "var(--text3)" }}>{label}</span>
    </div>
  );
}
