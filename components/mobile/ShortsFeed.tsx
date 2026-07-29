"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, Clapperboard } from "lucide-react";
import { ShortFeedItem } from "@/types";
import { useApp, useToast, usePlayer } from "@/store";
import { formatCount } from "@/lib/gamification";
import { useGamification } from "@/lib/useGamification";
import { Waveform } from "./MobileKit";

/* eslint-disable @next/next/no-img-element */

// Vertical, scroll-snapped reel feed.
//
// Playback model: ONE shared <audio> element for the whole feed, not
// one per card. An element per card would mean ~20 concurrent media
// resources and every one of them buffering — mobile browsers cap
// concurrent media elements and the feed would silently stop playing
// partway down. The single element is retargeted as cards come into
// view via IntersectionObserver.

const HEARTBEAT_SECONDS = 15;

export default function ShortsFeed() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const setPlaying = usePlayer(s => s.setPlaying);
  const { heartbeat } = useGamification();

  const [items, setItems] = useState<ShortFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setLocalPlaying] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Listening time accumulated but not yet reported, so the streak
  // heartbeat fires once every HEARTBEAT_SECONDS rather than per tick.
  const pendingSeconds = useRef(0);

  // ── Load feed ──
  useEffect(() => {
    const qs = user ? `?userId=${user._id}` : "";
    fetch(`/api/shorts${qs}`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?._id]);

  // Entering the Shorts feed pauses the main mini-player — two audio
  // sources playing over each other is never what anyone wants.
  useEffect(() => {
    setPlaying(false);
    return () => { setLocalPlaying(false); };
  }, [setPlaying]);

  // ── Which card is on screen ──
  useEffect(() => {
    if (!items.length) return;

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          }
        }
      },
      // 0.6 rather than 1.0: scroll-snap can settle a pixel or two off,
      // and a threshold of 1 would leave nothing "active" at rest.
      { threshold: [0.6], root: containerRef.current }
    );

    cardRefs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  // ── Retarget the shared audio element at the active clip ──
  useEffect(() => {
    const audio = audioRef.current;
    const item = items[activeIdx];
    if (!audio || !item) return;

    // Only reload if the underlying episode actually changed — several
    // shorts can be different ranges of the same episode, and reloading
    // would restart buffering for no reason.
    const url = new URL(item.audioUrl, window.location.href).href;
    if (audio.src !== url) {
      audio.src = item.audioUrl;
      audio.load();
    }
    audio.currentTime = item.startSec;

    if (playing) audio.play().catch(() => {
      // Autoplay was blocked (no user gesture yet). Reflect reality in
      // the UI instead of showing a spinning "playing" state forever.
      setLocalPlaying(false);
    });
  }, [activeIdx, items, playing]);

  // ── Loop within the clip's time range ──
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    const item = items[activeIdx];
    if (!audio || !item) return;

    if (audio.currentTime >= item.endSec) {
      audio.currentTime = item.startSec;
    }

    pendingSeconds.current += 0.25;
    if (pendingSeconds.current >= HEARTBEAT_SECONDS) {
      const secs = Math.round(pendingSeconds.current);
      pendingSeconds.current = 0;
      heartbeat(secs);
    }
  }, [activeIdx, items, heartbeat]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setLocalPlaying(false); }
    else { audio.play().catch(() => {}); setLocalPlaying(true); }
  };

  // ── Like ──
  const toggleLike = async (item: ShortFeedItem, idx: number) => {
    if (!user) { showToast("Log in to like shorts", "info"); return; }

    // Optimistic: the heart should respond to the tap instantly, and
    // the server is the source of truth for the final count.
    setItems(prev => prev.map((s, i) => i === idx
      ? { ...s, liked: !s.liked, likeCount: s.likeCount + (s.liked ? -1 : 1) }
      : s));

    try {
      const r = await fetch(`/api/shorts/${item._id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setItems(prev => prev.map((s, i) => i === idx
        ? { ...s, liked: d.liked, likeCount: d.likeCount } : s));
    } catch {
      // Roll the optimistic update back rather than leaving the UI
      // showing a like that never persisted.
      setItems(prev => prev.map((s, i) => i === idx
        ? { ...s, liked: item.liked, likeCount: item.likeCount } : s));
      showToast("Couldn't save that like", "error");
    }
  };

  const share = async (item: ShortFeedItem) => {
    const url = `${window.location.origin}/series/${item.seriesId}`;
    try {
      if (navigator.share) await navigator.share({ title: item.seriesTitle, url });
      else { await navigator.clipboard.writeText(url); showToast("Link copied", "success"); }
    } catch { /* user dismissed the share sheet — not an error */ }
  };

  if (loading) {
    return (
      <div style={{ height: "100dvh", display: "grid", placeItems: "center" }}>
        <div className="skeleton" style={{ width: "88%", height: "70%", borderRadius: 20 }}/>
      </div>
    );
  }

  if (!items.length) return <EmptyShorts/>;

  return (
    <div ref={containerRef} style={{
      position: "fixed", inset: 0, background: "#000",
      overflowY: "auto", scrollSnapType: "y mandatory",
      // Leaves the bottom tab bar tappable.
      paddingBottom: 0,
    }}>
      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} preload="auto" playsInline/>

      {items.map((item, idx) => (
        <div key={item._id}
          data-idx={idx}
          ref={el => { cardRefs.current[idx] = el; }}
          onClick={togglePlay}
          style={{
            scrollSnapAlign: "start", scrollSnapStop: "always",
            height: "100dvh", position: "relative",
            display: "flex", alignItems: "flex-end",
            background: item.gradient, overflow: "hidden", cursor: "pointer",
          }}>

          {/* Cover art, blurred back to a backdrop so text stays legible */}
          {item.coverImage && (
            <img src={item.coverImage} alt=""
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", opacity: .45, filter: "blur(6px)",
                transform: "scale(1.1)",
              }}/>
          )}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg,rgba(0,0,0,.35) 0%,transparent 35%,transparent 55%,rgba(0,0,0,.75) 100%)",
          }}/>

          <div style={{
            position: "absolute", top: 16, left: 16,
            background: "rgba(255,255,255,.25)", backdropFilter: "blur(6px)",
            color: "#fff", fontSize: 10.5, fontWeight: 700,
            padding: "5px 10px", borderRadius: 999,
          }}>
            Shorts
          </div>

          {/* Centre waveform + play state */}
          <div style={{
            position: "absolute", top: "50%", left: 0, right: 0,
            transform: "translateY(-50%)", padding: "0 70px 0 24px",
          }}>
            <Waveform seed={item._id} playing={playing && idx === activeIdx}/>
            {!playing && idx === activeIdx && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
                <div style={{
                  width: 58, height: 58, borderRadius: 999,
                  background: "rgba(0,0,0,.45)", backdropFilter: "blur(8px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Play size={24} color="#fff" fill="#fff"/>
                </div>
              </div>
            )}
          </div>

          {/* Right action rail */}
          <div style={{
            position: "absolute", right: 12, bottom: 150, zIndex: 3,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
            color: "#fff",
          }}>
            <ActionButton
              onClick={e => { e.stopPropagation(); toggleLike(item, idx); }}
              icon={<Heart size={26} fill={item.liked ? "var(--danger)" : "none"}
                      color={item.liked ? "var(--danger)" : "#fff"}/>}
              label={formatCount(item.likeCount)}
            />
            <ActionButton
              onClick={e => { e.stopPropagation(); showToast("Comments are coming soon", "info"); }}
              icon={<MessageCircle size={25}/>}
              label={formatCount(item.commentCount)}
            />
            <ActionButton
              onClick={e => { e.stopPropagation(); share(item); }}
              icon={<Share2 size={24}/>}
              label="Share"
            />
            <ActionButton
              onClick={e => { e.stopPropagation(); showToast("Saved to your library", "success"); }}
              icon={<Bookmark size={24}/>}
            />
            <button
              onClick={e => { e.stopPropagation(); togglePlay(); }}
              aria-label={playing ? "Pause" : "Play"}
              style={{
                width: 40, height: 40, borderRadius: 999, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,var(--accent),var(--accent2))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {playing && idx === activeIdx
                ? <Pause size={16} color="#fff" fill="#fff"/>
                : <Play size={16} color="#fff" fill="#fff"/>}
            </button>
          </div>

          {/* Caption block */}
          <div style={{
            position: "relative", zIndex: 3,
            padding: "20px 76px 150px 16px", color: "#fff", width: "100%",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999,
                background: "rgba(255,255,255,.3)", flex: "none",
              }}/>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{item.creatorHandle}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
              {item.caption || item.episodeTitle}
            </div>
            <Link href={`/series/${item.seriesId}`}
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 11.5, color: "rgba(255,255,255,.85)",
                marginTop: 4, display: "inline-block", textDecoration: "underline",
              }}>
              from {item.seriesTitle}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionButton({
  icon, label, onClick,
}: {
  icon: React.ReactNode; label?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      background: "none", border: "none", cursor: "pointer", color: "#fff",
      fontFamily: "var(--ff-sans)", padding: 0,
    }}>
      {icon}
      {label && <span style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</span>}
    </button>
  );
}

function EmptyShorts() {
  return (
    <div style={{
      minHeight: "70vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 14,
      padding: "40px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: "var(--accent)18",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Clapperboard size={26} color="var(--accent)"/>
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>No shorts yet</h2>
      <p style={{ fontSize: 13.5, color: "var(--text3)", maxWidth: 320, lineHeight: 1.6 }}>
        Shorts are clips cut from episodes you already have. Create them from
        the admin panel by picking a series, an episode, and a start/end time —
        no new audio upload needed.
      </p>
      <Link href="/admin/series" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
        Open admin
      </Link>
    </div>
  );
}
