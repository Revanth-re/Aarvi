"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic, Pencil, MessageSquare, Settings as Cog, Flame, Headphones, MessageCircle } from "lucide-react";
import { DnaSlice, Thought } from "@/types";
import { useApp } from "@/store";
import { formatCount } from "@/lib/gamification";
import { Screen, SectionHeader, Cover, EmptyState } from "@/components/kit";
import TopBar, { CoinGlyph } from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";
import ThoughtCard from "./ThoughtCard";

interface Game {
  coins: number; streak: number; hours: number;
  level: number; levelTitle: string; showCount: number;
}
interface RecentItem { _id: string; title: string; coverImage: string; }

export default function ProfileScreen() {
  const user = useApp(s => s.user);

  const [game, setGame] = useState<Game | null>(null);
  const [dna, setDna] = useState<DnaSlice[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      fetch(`/api/users/${user._id}/gamification`).then(r => r.json()),
      fetch(`/api/users/${user._id}/dna`).then(r => r.json()),
      fetch(`/api/thoughts?userId=${user._id}&authorId=${user._id}&limit=3`).then(r => r.json()),
    ])
      .then(([g, d, t]) => {
        if (cancelled) return;
        if (!g.error) setGame(g);
        if (Array.isArray(d.dna)) setDna(d.dna);
        if (Array.isArray(d.recent)) setRecent(d.recent);
        if (Array.isArray(t)) setThoughts(t);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?._id]);

  if (!user) {
    return (
      <>
        <TopBar title="Profile"/>
        <Screen>
          <EmptyState icon={<Mic size={22}/>} title="You're not logged in"
            body="Log in to track your streak, earn coins and keep your thoughts."
            cta={{ href: "/login", label: "Log in" }}/>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Profile"/>
      <Screen>
        {/* ── Header card ── */}
        <div style={{ background: "var(--grad)", borderRadius: "var(--r-lg)", padding: 18, boxShadow: "var(--shadow-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <span style={{ borderRadius: "50%", border: "2px solid rgba(255,255,255,.5)", display: "block", flex: "none" }}>
              <Avatar name={user.name} image={user.image} size={62}/>
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="truncate" style={{ display: "block", fontSize: 20, fontWeight: 800, color: "#fff" }}>
                {user.name || "Listener"}
              </span>
              <span className="truncate" style={{ display: "block", fontSize: 12.5, color: "rgba(255,255,255,.85)" }}>
                {user.handle ? `@${user.handle}` : "@listener"}
              </span>
            </span>
          </div>

          {user.bio && (
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.9)", margin: "0 0 12px", lineHeight: 1.5 }}>
              {user.bio}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link href="/creator" className="btn btn-xs" style={pillBtn}><Mic size={13}/>Creator Studio</Link>
            <Link href="/profile/edit" className="btn btn-xs" style={pillBtn}><Pencil size={13}/>Edit profile</Link>
            <Link href="/messages" className="btn btn-xs" style={pillBtn}><MessageSquare size={13}/>Messages</Link>
            <Link href="/settings" className="btn btn-xs" style={{ ...pillBtn, padding: "5px 10px" }} aria-label="Settings"><Cog size={13}/></Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          <Stat icon={<CoinGlyph size={15}/>} value={formatCount(game?.coins ?? 0)} label="Coins" href="/coins"/>
          <Stat icon={<Flame size={15}/>} value={String(game?.streak ?? 0)} label="Streak"/>
          <Stat icon={<Headphones size={15}/>} value={String(game?.showCount ?? 0)} label="Shows" href="/library"/>
          <Stat icon={<MessageCircle size={15}/>} value={String(thoughts.length)} label="Thoughts"/>
        </div>

        {/* ── Listening DNA ── */}
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

        {/* ── Your thoughts ── */}
        <section>
          <SectionHeader title="Your thoughts" href="/library"/>
          {thoughts.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {thoughts.map(t => <ThoughtCard key={t._id} thought={t}/>)}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--text3)" }}>
              Nothing yet — pin one from the player while you listen.
            </p>
          )}
        </section>

        {/* ── Recently played ── */}
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
      </Screen>
    </>
  );
}

function Stat({
  icon, value, label, href,
}: { icon: React.ReactNode; value: string; label: string; href?: string }) {
  const body = (
    <>
      <span style={{ display: "flex", justifyContent: "center", color: "var(--accent)", marginBottom: 4 }}>{icon}</span>
      <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{value}</span>
      <span style={{ display: "block", fontSize: 10, color: "var(--text3)" }}>{label}</span>
    </>
  );
  const style: React.CSSProperties = { padding: "13px 6px", textAlign: "center", textDecoration: "none", display: "block" };
  return href
    ? <Link href={href} className="card" style={style}>{body}</Link>
    : <div className="card" style={style}>{body}</div>;
}

const pillBtn: React.CSSProperties = {
  background: "rgba(255,255,255,.22)", color: "#fff",
  border: "1px solid rgba(255,255,255,.3)", backdropFilter: "blur(6px)",
};
