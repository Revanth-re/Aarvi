"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Play, TrendingUp, Zap, Radio, Mic, Flame, Coins } from "lucide-react";
import { Series, SquadView } from "@/types";
import { useApp, usePlayer } from "@/store";
import { useGamification } from "@/lib/useGamification";
import { MOODS, formatCount, gradientFor } from "@/lib/gamification";
import Avatar from "@/components/ui/Avatar";
import {
  Screen, SectionHeader, Rail, Chip, ShowCard, ShowCardSkeleton, BannerCard,
} from "./MobileKit";

/* eslint-disable @next/next/no-img-element */

interface ContinueItem {
  series: Series;
  episodeId?: string;
  position: number;
}

export default function MobileHome() {
  const router = useRouter();
  const user = useApp(s => s.user);
  const setEp = usePlayer(s => s.setEp);
  const { data: game } = useGamification();

  const [trending, setTrending] = useState<Series[]>([]);
  const [fresh, setFresh] = useState<Series[]>([]);
  const [squad, setSquad] = useState<SquadView | null>(null);
  const [cont, setCont] = useState<ContinueItem | null>(null);
  const [genre, setGenre] = useState("All");
  const [mood, setMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Catalog rails ──
  // Refetches when the genre/mood chips change; both are just query
  // params on the existing /api/series route. The whole body is in an
  // async closure so no setState runs synchronously during the effect.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const qs = new URLSearchParams({ limit: "10" });
      if (genre !== "All") qs.set("genre", genre);
      if (mood) qs.set("mood", mood);

      try {
        const [t, f] = await Promise.all([
          fetch(`/api/series?trending=true&${qs}`).then(r => r.json()),
          fetch(`/api/series?sort=new&${qs}`).then(r => r.json()),
        ]);
        if (cancelled) return;
        setTrending(Array.isArray(t) ? t : []);
        setFresh(Array.isArray(f) ? f : []);
      } catch {
        // Leave whatever was already on screen rather than blanking
        // the rails because one refetch failed.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [genre, mood]);

  // ── Squad beams row ──
  // Only ever *sets* on success. Logged-out state is derived at render
  // time (see `beams` below) instead of being cleared here, which keeps
  // this effect free of synchronous setState.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetch(`/api/squad?userId=${user._id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setSquad(d.squad ?? null); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?._id]);

  // ── Continue listening ──
  // Uses the favorites list as the candidate set, reusing the records
  // the player already writes rather than needing a new "recents"
  // table. Same derive-don't-clear rule as above.
  const firstFavorite = user?.favorites?.[0];

  useEffect(() => {
    if (!firstFavorite) return;
    let cancelled = false;

    fetch(`/api/series/${firstFavorite}`)
      .then(r => r.json())
      .then((s: Series) => {
        if (cancelled || !s?._id) return;
        setCont({ series: s, episodeId: s.episodes?.[0]?._id, position: 0 });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [firstFavorite]);

  // Derived, so logging out hides these immediately without an effect
  // having to race to clear them.
  const beams = user ? (squad?.members ?? []) : [];
  const continueItem = firstFavorite ? cont : null;

  const playContinue = () => {
    if (!continueItem) return;
    const ep = continueItem.series.episodes?.find(e => e._id === continueItem.episodeId)
      ?? continueItem.series.episodes?.[0];
    if (ep) setEp(ep, continueItem.series);
  };

  const genres = ["All", "Romance", "Horror", "Thriller", "Comedy", "Sci-Fi", "Folklore"];

  return (
    <Screen>
      {/* ── Header: brand + streak + coins ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="font-display" style={{
          fontSize: 22, fontWeight: 400, color: "var(--text)", letterSpacing: "-.02em",
        }}>
          Aarvi
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/profile" style={{
            display: "flex", alignItems: "center", gap: 5, textDecoration: "none",
            background: "var(--surface)", border: "1px solid var(--border2)",
            borderRadius: 999, padding: "6px 10px",
            fontSize: 12, fontWeight: 700, color: "var(--warning)",
          }}>
            <Flame size={14}/>{game?.streak ?? 0}
          </Link>
          <Link href="/wallet" style={{
            display: "flex", alignItems: "center", gap: 5, textDecoration: "none",
            background: "var(--surface)", border: "1px solid var(--border2)",
            borderRadius: 999, padding: "6px 10px",
            fontSize: 12, fontWeight: 700, color: "var(--accent)",
          }}>
            <Coins size={14}/>{(game?.coins ?? 0).toLocaleString()}
          </Link>
        </div>
      </div>

      {/* ── Squad beams (story-style row) ── */}
      <div className="no-scroll" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "2px 0" }}>
        <button onClick={() => router.push("/profile#squad")} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          flex: "none", cursor: "pointer", background: "none", border: "none",
          fontFamily: "var(--ff-sans)",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 999, background: "var(--surface)",
            border: "1.5px dashed var(--accent)66", display: "flex",
            alignItems: "center", justifyContent: "center", color: "var(--accent)",
          }}>
            <Plus size={18}/>
          </div>
          <span style={{ fontSize: 10.5, color: "var(--text3)", fontWeight: 600 }}>Your Beam</span>
        </button>

        {beams
          .filter(m => m.userId !== user?._id)
          .map(m => (
            <Link key={m.userId} href={`/u/${m.userId}`} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              flex: "none", textDecoration: "none",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 999, padding: 2, position: "relative",
                // A filled ring means "checked in today" — the whole
                // point of the squad streak, readable at a glance.
                background: m.checkedIn
                  ? "linear-gradient(135deg,var(--accent),var(--accent2))"
                  : "var(--border2)",
              }}>
                <div style={{
                  width: "100%", height: "100%", borderRadius: 999,
                  border: "2px solid var(--bg)", overflow: "hidden",
                }}>
                  <Avatar name={m.name} image={m.image} size={44}/>
                </div>
                {m.checkedIn && (
                  <div style={{
                    position: "absolute", bottom: -2, left: "50%",
                    transform: "translateX(-50%)", background: "var(--accent)",
                    color: "#fff", fontSize: 8, fontWeight: 800,
                    padding: "1px 5px", borderRadius: 999, letterSpacing: ".03em",
                  }}>
                    DONE
                  </div>
                )}
              </div>
              <span className="truncate" style={{
                fontSize: 10.5, color: "var(--text3)", fontWeight: 600, maxWidth: 56,
              }}>
                {m.name.split(" ")[0]}
              </span>
            </Link>
          ))}
      </div>

      {/* ── Continue listening ── */}
      {continueItem && (
        <button onClick={playContinue} style={{
          background: "linear-gradient(135deg,var(--accent),var(--accent2))",
          borderRadius: 22, padding: 16, display: "flex", alignItems: "center",
          gap: 14, cursor: "pointer", border: "none", width: "100%",
          textAlign: "left", fontFamily: "var(--ff-sans)",
          boxShadow: "0 12px 28px var(--accent)40",
        }}>
          <div style={{
            width: 84, height: 84, borderRadius: 14, overflow: "hidden", flex: "none",
            background: gradientFor(continueItem.series._id),
          }}>
            {continueItem.series.coverImage && (
              <img src={continueItem.series.coverImage} alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,.85)",
              letterSpacing: ".04em", textTransform: "uppercase",
            }}>
              Continue
            </div>
            <div className="truncate" style={{
              fontSize: 14.5, fontWeight: 700, color: "#fff", margin: "2px 0 8px",
            }}>
              {continueItem.series.title}
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,.3)" }}>
              <div style={{
                width: `${Math.min(100, continueItem.position)}%`, height: "100%",
                borderRadius: 99, background: "#fff",
              }}/>
            </div>
          </div>
          <div style={{
            width: 38, height: 38, borderRadius: 999, background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flex: "none", color: "var(--accent)",
          }}>
            <Play size={15} fill="currentColor"/>
          </div>
        </button>
      )}

      {/* ── Mood picker ── */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
          What&apos;s your mood tonight?
        </div>
        <div className="no-scroll" style={{ display: "flex", gap: 9, overflowX: "auto" }}>
          {MOODS.map(m => {
            const active = mood === m.key;
            return (
              <button key={m.key}
                onClick={() => setMood(active ? null : m.key)}
                style={{
                  flex: "none", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6, borderRadius: 16,
                  padding: "12px 16px", minWidth: 68, cursor: "pointer",
                  fontFamily: "var(--ff-sans)",
                  background: active ? "var(--accent)18" : "var(--surface)",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{m.emoji}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap",
                  color: active ? "var(--accent)" : "var(--text3)",
                }}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Listen-together rooms ── */}
      <BannerCard
        gradient
        href="/series"
        icon={<Radio size={18}/>}
        title="Listen Together"
        subtitle="Start a room and react with friends, in real time"
      />

      {/* ── Genre pills ── */}
      <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {genres.map(g => (
          <Chip key={g} label={g} active={genre === g} onClick={() => setGenre(g)}/>
        ))}
      </div>

      {/* ── Trending ── */}
      <div>
        <SectionHeader
          title="Trending now"
          icon={<TrendingUp size={15} color="var(--accent2)"/>}
          href="/series"
        />
        <Rail>
          {loading
            ? [0, 1, 2].map(i => <ShowCardSkeleton key={i}/>)
            : trending.length
              ? trending.map(s => <ShowCard key={s._id} series={s}/>)
              : <EmptyRail label="Nothing here for that filter yet"/>}
        </Rail>
      </div>

      {/* ── Fresh drops ── */}
      <div>
        <SectionHeader
          title="Fresh drops"
          icon={<Zap size={15} color="var(--accent)"/>}
          href="/series"
        />
        <Rail>
          {loading
            ? [0, 1, 2].map(i => <ShowCardSkeleton key={i}/>)
            : fresh.length
              ? fresh.map(s => <ShowCard key={s._id} series={s}/>)
              : <EmptyRail label="No new releases yet"/>}
        </Rail>
      </div>

      {/* ── Creator CTA ── */}
      <BannerCard
        gradient
        href="/shorts"
        icon={<Mic size={20}/>}
        title="Watch Shorts"
        subtitle="Bite-sized moments from every series"
      />
    </Screen>
  );
}

function EmptyRail({ label }: { label: string }) {
  return (
    <div style={{
      padding: "20px 4px", fontSize: 12.5, color: "var(--text3)",
    }}>
      {label}
    </div>
  );
}
