"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Heart, Lock, Star, MessageCircle, Share2, Mic2 } from "lucide-react";
import { Series, Episode, Thought } from "@/types";
import { useApp, usePlayer, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
import { formatCount, formatTime, UNLOCK_EPISODE_COST } from "@/lib/gamification";
import { Screen, Cover, SectionHeader, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import ThoughtCard from "./ThoughtCard";
import RatingWidget from "./RatingWidget";
import Avatar from "@/components/ui/Avatar";

export default function SeriesDetail({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const { user, setUser, liked, toggleLike } = useApp();
  const setEp = usePlayer(s => s.setEp);
  const showToast = useToast(s => s.show);

  const [series, setSeries] = useState<Series | null>(null);
  const [creator, setCreator] = useState<{ _id: string; name: string; handle: string; image: string } | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState("");
  const [unlocked, setUnlocked] = useState<string[]>(user?.["unlockedEpisodes" as keyof typeof user] as string[] ?? []);
  // Optimistic only — not fetched per-episode on load (would mean one
  // extra request per episode just to find out if you'd liked it
  // before). Starts empty each visit; the heart still reflects reality
  // the moment you actually tap it.
  const [likedEpisodes, setLikedEpisodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      creatorFetch(`/api/series/${seriesId}`).then(r => r.json()),
      fetch(`/api/thoughts?seriesId=${seriesId}&limit=10${user ? `&userId=${user._id}` : ""}`).then(r => r.json()),
    ])
      .then(([s, t]) => {
        if (cancelled) return;
        if (s?._id) setSeries(s);
        if (Array.isArray(t)) setThoughts(t);
        if (s?.creatorId) {
          fetch(`/api/users/${s.creatorId}`).then(r => r.json())
            .then(u => { if (!cancelled && !u.error) setCreator(u); })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seriesId, user?._id]);

  const isFav = user ? (user.favorites ?? []).includes(seriesId) : liked.includes(seriesId);

  const fav = async () => {
    if (!user) { toggleLike(seriesId); showToast(isFav ? "Removed" : "Saved to Library", "success"); return; }
    try {
      const r = await fetch(`/api/users/${user._id}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setUser({ ...user, favorites: d.favorites });
      showToast(d.favorites.includes(seriesId) ? "Saved to Library" : "Removed", "success");
    } catch { showToast("Couldn't update", "error"); }
  };

  const isUnlocked = useCallback(
    (ep: Episode) => !ep.isLocked || unlocked.includes(`${seriesId}:${ep._id}`),
    [unlocked, seriesId]
  );

  const play = (ep: Episode) => {
    if (!series) return;
    if (!isUnlocked(ep)) { showToast(`Unlock this episode for ${UNLOCK_EPISODE_COST} coins`, "info"); return; }
    if (!ep.audioUrl) { showToast("No audio attached to this episode yet", "info"); return; }
    setEp(ep, series);
    // Player.tsx fires the real POST /api/episodes/[id]/play once audio
    // actually starts — this just reflects it here immediately rather
    // than waiting for a refetch of this whole page.
    setSeries(prev => prev && {
      ...prev,
      totalPlays: (prev.totalPlays ?? 0) + 1,
      episodes: prev.episodes.map(e => e._id === ep._id ? { ...e, playCount: (e.playCount ?? 0) + 1 } : e),
    });
  };

  const unlock = async (ep: Episode) => {
    if (!user) { showToast("Log in to unlock episodes", "info"); return; }
    setUnlocking(ep._id);
    try {
      const r = await fetch("/api/episodes/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, seriesId, episodeId: ep._id }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't unlock", "error"); return; }
      setUnlocked(prev => [...prev, `${seriesId}:${ep._id}`]);
      showToast(`Unlocked · ${d.coins} coins left`, "success");
    } catch { showToast("Network error", "error"); }
    finally { setUnlocking(""); }
  };

  const toggleEpisodeLike = async (ep: Episode) => {
    if (!user) { showToast("Log in to like episodes", "info"); return; }
    if (!series) return;
    const wasLiked = likedEpisodes.has(ep._id);
    // Optimistic: flip the heart and nudge the count immediately.
    setLikedEpisodes(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(ep._id); else next.add(ep._id);
      return next;
    });
    setSeries(prev => prev && {
      ...prev,
      episodes: prev.episodes.map(e => e._id === ep._id
        ? { ...e, likeCount: (e.likeCount ?? 0) + (wasLiked ? -1 : 1) }
        : e),
    });
    try {
      const r = await fetch(`/api/episodes/${ep._id}/like`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, seriesId: series._id }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      // Reconcile with the server's real count in case of a race.
      setSeries(prev => prev && {
        ...prev,
        episodes: prev.episodes.map(e => e._id === ep._id ? { ...e, likeCount: d.likeCount } : e),
      });
    } catch {
      // Roll back.
      setLikedEpisodes(prev => {
        const next = new Set(prev);
        if (wasLiked) next.add(ep._id); else next.delete(ep._id);
        return next;
      });
      setSeries(prev => prev && {
        ...prev,
        episodes: prev.episodes.map(e => e._id === ep._id
          ? { ...e, likeCount: (e.likeCount ?? 0) + (wasLiked ? 1 : -1) }
          : e),
      });
      showToast("Couldn't save that like", "error");
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: series?.title, url });
      else { await navigator.clipboard.writeText(url); showToast("Link copied", "success"); }
    } catch { /* dismissed */ }
  };

  if (loading) {
    return (<><TopBar title="Series"/><Screen><div className="skeleton" style={{ height: 220, borderRadius: 20 }}/></Screen></>);
  }
  if (!series) {
    return (
      <><TopBar title="Series"/><Screen>
        <EmptyState icon={<Play size={22}/>} title="Series not found"
          body="It may have been removed." cta={{ href: "/discover", label: "Browse" }}/>
      </Screen></>
    );
  }

  const episodes = [...(series.episodes ?? [])].sort((a, b) => a.episodeNumber - b.episodeNumber);
  // The narrator credit, if the creator tagged one — makes the name
  // tappable through to their profile. Falls back to the plain
  // `narrator` text field (no linked account) otherwise.
  const narratorCredit = series.credits?.find(c => /narrat|voice/i.test(c.role));

  return (
    <>
      <TopBar title={series.title}/>
      <Screen>
        <button onClick={() => router.back()} aria-label="Back"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 0 }}>
          <ArrowLeft size={20}/>
        </button>

        <div style={{ display: "flex", gap: 14 }}>
          <Cover id={series._id} url={series.coverImage} size={116} radius={16}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 21, fontWeight: 800, margin: "0 0 4px", color: "var(--text)" }}>
              {series.title}
            </h1>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "0 0 4px" }}>
              {series.genre} · {series.language} · {episodes.length} eps
            </p>
            {(narratorCredit || series.narrator) && (
              <p style={{ fontSize: 12, color: "var(--text2)", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 4 }}>
                <Mic2 size={12} color="var(--text3)"/>
                {narratorCredit ? (
                  <>Narrated by <Link href={`/u/${narratorCredit.userId}`} style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>{narratorCredit.name}</Link></>
                ) : (
                  <>Narrated by {series.narrator}</>
                )}
              </p>
            )}
            <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text3)", margin: "0 0 10px" }}>
              <Star size={12} fill="var(--coin)" color="var(--coin)"/>
              {series.rating?.toFixed(1)} · {formatCount(series.totalPlays ?? 0)} plays
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={fav} className={`btn btn-xs ${isFav ? "btn-primary" : "btn-soft"}`}>
                <Heart size={12} fill={isFav ? "#fff" : "none"}/>{isFav ? "Saved" : "Save"}
              </button>
              <button onClick={share} className="btn btn-xs btn-soft" aria-label="Share"><Share2 size={12}/></button>
            </div>
          </div>
        </div>

        {series.description && (
          <p style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{series.description}</p>
        )}

        {creator && (
          <Link href={`/u/${creator._id}`} style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
            padding: "10px 12px", borderRadius: 14, background: "var(--surface2)",
          }}>
            <Avatar name={creator.name} image={creator.image} size={34}/>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 10.5, color: "var(--text3)", lineHeight: 1.2 }}>Published by</span>
              <span className="truncate" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
                {creator.name}{creator.handle && ` · @${creator.handle}`}
              </span>
            </span>
          </Link>
        )}

        {!!series.credits?.length && (
          <section>
            <SectionHeader title="Credits"/>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {series.credits.map((c, i) => (
                <Link key={`${c.userId}-${i}`} href={`/u/${c.userId}`} style={{
                  display: "flex", alignItems: "center", gap: 7, textDecoration: "none",
                  padding: "6px 10px 6px 6px", borderRadius: "var(--r-pill)", background: "var(--surface2)",
                }}>
                  <Avatar name={c.name} image={c.image} size={22}/>
                  <span>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: 10, color: "var(--text3)", lineHeight: 1.2 }}>{c.role}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader title={`${episodes.length} episodes`}/>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {episodes.map(ep => {
              const open = isUnlocked(ep);
              return (
                <div key={ep._id} className="card" style={{ display: "flex", alignItems: "center", gap: 11, padding: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", width: 24, flex: "none" }}>
                    {ep.episodeNumber}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="truncate" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                        {ep.title}
                      </span>
                      {ep.isDraft && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase",
                          padding: "2px 6px", borderRadius: "var(--r-pill)", flex: "none",
                          background: "color-mix(in srgb, var(--warning) 16%, transparent)", color: "var(--warning)",
                        }}>
                          Draft
                        </span>
                      )}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--text3)" }}>
                      <span>{formatTime(ep.duration || 0)}{!ep.audioUrl && " · no audio yet"}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Play size={9} fill="var(--text3)"/>{formatCount(ep.playCount || 0)}
                      </span>
                      <button onClick={e => { e.stopPropagation(); toggleEpisodeLike(ep); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 3, background: "none", border: "none",
                          cursor: "pointer", padding: 0, color: likedEpisodes.has(ep._id) ? "var(--danger)" : "var(--text3)",
                        }}>
                        <Heart size={11} fill={likedEpisodes.has(ep._id) ? "var(--danger)" : "none"}/>
                        {formatCount(ep.likeCount || 0)}
                      </button>
                    </span>
                  </span>
                  {open ? (
                    <button onClick={() => play(ep)} aria-label={`Play ${ep.title}`}
                      style={{
                        width: 34, height: 34, borderRadius: "50%", border: "none", flex: "none",
                        background: "var(--grad)", color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      <Play size={14} fill="#fff"/>
                    </button>
                  ) : (
                    <button onClick={() => unlock(ep)} disabled={unlocking === ep._id}
                      className="btn btn-xs btn-soft" style={{ flex: "none" }}>
                      <Lock size={11}/>{unlocking === ep._id ? "…" : UNLOCK_EPISODE_COST}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionHeader title="Ratings & reviews"/>
          <RatingWidget seriesId={series._id}/>
        </section>

        <section>
          <SectionHeader title="Thoughts" icon={<MessageCircle size={15} color="var(--accent)"/>}
            sub="Notes listeners pinned inside these episodes"/>
          {thoughts.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {thoughts.map(t => (
                <ThoughtCard key={t._id} thought={t}
                  onDeleted={id => setThoughts(prev => prev.filter(x => x._id !== id))}/>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--text3)" }}>
              No thoughts on this one yet — be first while you listen.
            </p>
          )}
        </section>
      </Screen>
    </>
  );
}
