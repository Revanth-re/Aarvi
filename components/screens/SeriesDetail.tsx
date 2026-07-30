"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Heart, Lock, Star, MessageCircle, Share2, Send, ChevronDown, ChevronUp, Tv } from "lucide-react";
import { Series, Episode, Thought, Review } from "@/types";
import { useApp, usePlayer, useToast } from "@/store";
import { formatCount, formatTime, timeAgo, UNLOCK_EPISODE_COST } from "@/lib/gamification";
import { Screen, Cover, SectionHeader, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import ThoughtCard from "./ThoughtCard";

export default function SeriesDetail({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const { user, setUser, liked, toggleLike } = useApp();
  const setEp = usePlayer(s => s.setEp);
  const playerEp = usePlayer(s => s.ep);
  const playerProgress = usePlayer(s => s.progress);
  const showToast = useToast(s => s.show);

  const [series, setSeries] = useState<Series | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState("");
  const [unlocked, setUnlocked] = useState<string[]>(user?.["unlockedEpisodes" as keyof typeof user] as string[] ?? []);

  // ── Ratings & reviews ──
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [myStars, setMyStars] = useState(0);
  const [myReviewText, setMyReviewText] = useState("");
  const [postingReview, setPostingReview] = useState(false);

  // ── Per-episode timestamp comments ──
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null);
  const [episodeThoughts, setEpisodeThoughts] = useState<Record<string, Thought[]>>({});
  const [episodeThoughtsLoading, setEpisodeThoughtsLoading] = useState<Record<string, boolean>>({});
  const [episodeDraft, setEpisodeDraft] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<string | null>(null);

  // ── Watch-an-ad-to-unlock ──
  // No real ad network is wired in yet, so this is a timed placeholder
  // standing in for a rewarded-ad flow — same end result (the episode
  // unlocks), just without an actual ad served. Swapping in a real ad
  // SDK later only touches startWatchAd below; the unlock API call at
  // the end stays the same.
  const AD_SECONDS = 8;
  const [adEpisode, setAdEpisode] = useState<Episode | null>(null);
  const [adSecondsLeft, setAdSecondsLeft] = useState(AD_SECONDS);
  const adTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/series/${seriesId}`).then(r => r.json()),
      fetch(`/api/thoughts?seriesId=${seriesId}&limit=10${user ? `&userId=${user._id}` : ""}`).then(r => r.json()),
      fetch(`/api/series/${seriesId}/reviews${user ? `?userId=${user._id}` : ""}`).then(r => r.json()),
    ])
      .then(([s, t, rv]) => {
        if (cancelled) return;
        if (s?._id) setSeries(s);
        if (Array.isArray(t)) setThoughts(t);
        if (Array.isArray(rv?.reviews)) {
          setReviews(rv.reviews);
          setRatingAvg(rv.avg ?? 0);
          setRatingCount(rv.count ?? 0);
          if (rv.myReview) { setMyStars(rv.myReview.stars); setMyReviewText(rv.myReview.text || ""); }
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

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: series?.title, url });
      else { await navigator.clipboard.writeText(url); showToast("Link copied", "success"); }
    } catch { /* dismissed */ }
  };

  // Posting again with a different star count edits your existing
  // review rather than adding a second one — the server upserts on
  // (seriesId, userId).
  const postReview = async () => {
    if (!user) { showToast("Log in to leave a review", "info"); return; }
    if (!myStars) { showToast("Pick a star rating first", "info"); return; }
    setPostingReview(true);
    try {
      const r = await fetch(`/api/series/${seriesId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, stars: myStars, text: myReviewText.trim() }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't post review", "error"); return; }

      const rv = await fetch(`/api/series/${seriesId}/reviews?userId=${user._id}`).then(x => x.json());
      if (Array.isArray(rv?.reviews)) {
        setReviews(rv.reviews);
        setRatingAvg(rv.avg ?? 0);
        setRatingCount(rv.count ?? 0);
      }
      setSeries(prev => prev ? { ...prev, rating: d.avg ?? prev.rating, ratingCount: d.count ?? prev.ratingCount } : prev);
      showToast("Review posted", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setPostingReview(false);
    }
  };

  // Expand/collapse an episode's timestamp comments — fetched lazily,
  // once, the first time it's opened.
  const toggleEpisodeComments = async (ep: Episode) => {
    if (expandedEpisodeId === ep._id) { setExpandedEpisodeId(null); return; }
    setExpandedEpisodeId(ep._id);
    if (episodeThoughts[ep._id]) return;

    setEpisodeThoughtsLoading(prev => ({ ...prev, [ep._id]: true }));
    try {
      const d = await fetch(`/api/thoughts?episodeId=${ep._id}&seriesId=${seriesId}${user ? `&userId=${user._id}` : ""}`)
        .then(r => r.json());
      setEpisodeThoughts(prev => ({ ...prev, [ep._id]: Array.isArray(d) ? d : [] }));
    } catch {
      setEpisodeThoughts(prev => ({ ...prev, [ep._id]: [] }));
    } finally {
      setEpisodeThoughtsLoading(prev => ({ ...prev, [ep._id]: false }));
    }
  };

  // Defaults to the live playback position if this episode happens to
  // be the one currently loaded in the player, otherwise 0:00 — same
  // "mark a moment" idea as the full-screen player's thought composer,
  // just reachable without leaving the series page.
  const postEpisodeComment = async (ep: Episode) => {
    if (!user) { showToast("Log in to comment", "info"); return; }
    const text = (episodeDraft[ep._id] || "").trim();
    if (!text) return;
    const atSec = playerEp?._id === ep._id ? Math.floor(playerProgress) : 0;

    setPostingComment(ep._id);
    try {
      const r = await fetch("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, seriesId, episodeId: ep._id, atSec, text }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't post", "error"); return; }
      setEpisodeThoughts(prev => ({ ...prev, [ep._id]: [...(prev[ep._id] || []), d] }));
      setEpisodeDraft(prev => ({ ...prev, [ep._id]: "" }));
    } catch {
      showToast("Network error", "error");
    } finally {
      setPostingComment(null);
    }
  };

  // Opens the ad modal and starts the countdown. Cancelling (closing
  // the modal early) does NOT unlock the episode — only reaching 0
  // does, same as a real rewarded ad only paying out once it's
  // actually watched through.
  const startWatchAd = (ep: Episode) => {
    if (!user) { showToast("Log in to unlock episodes", "info"); return; }
    setAdEpisode(ep);
    setAdSecondsLeft(AD_SECONDS);
    if (adTimer.current) clearInterval(adTimer.current);
    adTimer.current = setInterval(() => {
      setAdSecondsLeft(s => {
        if (s <= 1) {
          if (adTimer.current) clearInterval(adTimer.current);
          adTimer.current = null;
          finishWatchAd(ep);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const cancelWatchAd = () => {
    if (adTimer.current) { clearInterval(adTimer.current); adTimer.current = null; }
    setAdEpisode(null);
  };

  const finishWatchAd = async (ep: Episode) => {
    if (!user) { setAdEpisode(null); return; }
    try {
      const r = await fetch("/api/episodes/unlock-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, seriesId, episodeId: ep._id }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't unlock", "error"); return; }
      setUnlocked(prev => [...prev, `${seriesId}:${ep._id}`]);
      showToast("Unlocked", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setAdEpisode(null);
    }
  };

  // Stop the interval if the screen unmounts mid-countdown.
  useEffect(() => () => { if (adTimer.current) clearInterval(adTimer.current); }, []);

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
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "0 0 8px" }}>
              {series.genre} · {series.language} · {episodes.length} eps
            </p>
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

        <section>
          <SectionHeader title={`${episodes.length} episodes`}/>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {episodes.map(ep => {
              const open = isUnlocked(ep);
              const expanded = expandedEpisodeId === ep._id;
              const epThoughts = episodeThoughts[ep._id];
              return (
                <div key={ep._id} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", width: 24, flex: "none" }}>
                      {ep.episodeNumber}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="truncate" style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                        {ep.title}
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>
                        {formatTime(ep.duration || 0)}{!ep.audioUrl && " · no audio yet"}
                      </span>
                    </span>
                    <button onClick={() => toggleEpisodeComments(ep)} aria-label="Timestamp comments"
                      style={{
                        display: "flex", alignItems: "center", gap: 3, background: "none", border: "none",
                        cursor: "pointer", color: expanded ? "var(--accent)" : "var(--text3)", flex: "none", padding: 4,
                      }}>
                      <MessageCircle size={16}/>
                      {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                    </button>
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
                      <>
                        <button onClick={() => startWatchAd(ep)} aria-label="Watch an ad to unlock"
                          className="btn btn-xs btn-soft" style={{ flex: "none" }}>
                          <Tv size={11}/>Ad
                        </button>
                        <button onClick={() => unlock(ep)} disabled={unlocking === ep._id}
                          className="btn btn-xs btn-soft" style={{ flex: "none" }}>
                          <Lock size={11}/>{unlocking === ep._id ? "…" : UNLOCK_EPISODE_COST}
                        </button>
                      </>
                    )}
                  </div>

                  {expanded && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <p style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text3)", margin: "0 0 8px" }}>
                        Timestamp comments · Ep {ep.episodeNumber}: {ep.title}
                      </p>

                      {episodeThoughtsLoading[ep._id] ? (
                        <div className="skeleton" style={{ height: 40, borderRadius: 10 }}/>
                      ) : epThoughts && epThoughts.length ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                          {epThoughts.map(t => (
                            <div key={t._id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{
                                fontSize: 10.5, fontWeight: 700, color: "var(--accent)", flex: "none",
                                background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                                borderRadius: 999, padding: "2px 7px", marginTop: 1,
                              }}>
                                {formatTime(t.atSec)}
                              </span>
                              <span style={{ minWidth: 0, fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5 }}>
                                <strong style={{ color: "var(--text)" }}>{t.userName}</strong> {t.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: "var(--text3)", margin: "0 0 10px" }}>
                          No comments on this episode yet — be the first to mark a moment.
                        </p>
                      )}

                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="inp" value={episodeDraft[ep._id] || ""}
                          onChange={e => setEpisodeDraft(prev => ({ ...prev, [ep._id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); postEpisodeComment(ep); } }}
                          placeholder={`Comment at ${formatTime(playerEp?._id === ep._id ? playerProgress : 0)}...`}
                          aria-label="Add a timestamp comment" style={{ fontSize: 13, padding: "9px 13px" }}/>
                        <button onClick={() => postEpisodeComment(ep)}
                          disabled={postingComment === ep._id || !(episodeDraft[ep._id] || "").trim()}
                          aria-label="Post comment" style={{
                            width: 38, height: 38, borderRadius: "50%", border: "none", flex: "none",
                            background: "var(--grad)", color: "#fff", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: (postingComment === ep._id || !(episodeDraft[ep._id] || "").trim()) ? .55 : 1,
                          }}>
                          <Send size={15}/>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: 0 }}>Ratings & reviews</h2>
            {ratingCount > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--text2)" }}>
                <Star size={13} fill="var(--coin)" color="var(--coin)"/>
                {ratingAvg.toFixed(1)} · {ratingCount} rating{ratingCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="card" style={{ padding: 14, marginBottom: reviews.length ? 10 : 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", margin: "0 0 8px" }}>Rate this series</p>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setMyStars(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
                  <Star size={22} fill={n <= myStars ? "var(--coin)" : "none"} color="var(--coin)"/>
                </button>
              ))}
            </div>
            <textarea className="inp" value={myReviewText} onChange={e => setMyReviewText(e.target.value)}
              placeholder="What did you think?" rows={3} style={{ fontSize: 13, marginBottom: 10 }}/>
            <button onClick={postReview} disabled={postingReview || !myStars}
              className="btn btn-primary" style={{ width: "100%", justifyContent: "center", opacity: (postingReview || !myStars) ? .6 : 1 }}>
              {postingReview ? "Posting…" : "Post review"}
            </button>
          </div>

          {reviews.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reviews.map(rv => (
                <div key={rv._id} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{rv.userName}</span>
                    <span style={{ display: "flex", gap: 1 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={11} fill={n <= rv.stars ? "var(--coin)" : "none"} color="var(--coin)"/>
                      ))}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--text3)", marginLeft: "auto" }}>{timeAgo(rv.createdAt)}</span>
                  </div>
                  {rv.text && <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5, margin: 0 }}>{rv.text}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </Screen>

      {adEpisode && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.85)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 360, padding: 24, textAlign: "center" }}>
            <span style={{
              width: 56, height: 56, borderRadius: "50%", background: "var(--grad)", margin: "0 auto 14px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Tv size={24} color="#fff"/>
            </span>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
              Watch a short ad to unlock
            </p>
            <p style={{ fontSize: 12.5, color: "var(--text3)", margin: "0 0 18px" }}>
              {adEpisode.title}
            </p>
            <div style={{
              height: 6, borderRadius: 999, background: "var(--surface2)", overflow: "hidden", marginBottom: 12,
            }}>
              <div style={{
                height: "100%", background: "var(--grad)", borderRadius: 999,
                width: `${((AD_SECONDS - adSecondsLeft) / AD_SECONDS) * 100}%`,
                transition: "width 1s linear",
              }}/>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "0 0 16px" }}>
              Unlocking in {adSecondsLeft}s…
            </p>
            <button onClick={cancelWatchAd} className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
