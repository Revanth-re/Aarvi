"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlayer, useApp, useToast } from "@/store";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X,
  ChevronUp, ChevronDown, RotateCcw, RotateCw, Moon, Heart,
  Users, Copy, Share2
} from "lucide-react";
import { getPusherClient } from "@/lib/pusherClient";
import ReactionOverlay from "./ReactionOverlay";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];
const REACTIONS = ["❤️", "😂", "😮", "🔥", "👏"];

// How often (ms) we quietly save playback position to the server so
// followers can see "X is on Episode N" on the series page.
const PROGRESS_SYNC_INTERVAL = 12000;
// How often (ms) the host re-broadcasts position to a listen-together
// room, so anyone who joins mid-episode catches up.
const ROOM_HEARTBEAT_INTERVAL = 4000;

function genRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function MiniPlayer() {
  const path = usePathname();
  const { ep, series, playing, progress, duration, volume, rate, setPlaying, setProgress, setDuration, setVolume, setRate, next, prev } = usePlayer();
  const { liked, toggleLike, user, setUser } = useApp();
  const showToast = useToast(s => s.show);
  const ref = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [rIdx, setRIdx] = useState(1);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const sleepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(progress);

  // ─── Listen together (room) state ───
  const [room, setRoom] = useState<string | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);

  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => { if (ep) setDismissed(false); }, [ep?._id]);
  useEffect(() => { if (!ref.current || !ep) return; ref.current.src = ep.audioUrl; ref.current.load(); if (playing) ref.current.play().catch(() => {}); }, [ep?._id]);
  useEffect(() => { if (!ref.current) return; playing ? ref.current.play().catch(() => {}) : ref.current.pause(); }, [playing]);
  useEffect(() => { if (ref.current) ref.current.volume = muted ? 0 : volume; }, [volume, muted]);
  useEffect(() => { if (ref.current) (ref.current as any).playbackRate = rate; }, [rate]);

  // Periodically save playback position for logged-in users, so
  // followers can see where they've gotten to on a shared series.
  useEffect(() => {
    if (!ep || !series || !user || !playing) return;
    const saveProgress = () => {
      fetch(`/api/users/${user._id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: series._id, episodeId: ep._id, position: progressRef.current }),
      }).catch(() => {});
    };
    const iv = setInterval(saveProgress, PROGRESS_SYNC_INTERVAL);
    return () => { clearInterval(iv); saveProgress(); };
  }, [ep?._id, series?._id, user?._id, playing]);

  // ─── Listen together: broadcast helper + heartbeat + reactions ───
  const broadcastEvent = useCallback((type: string, payload?: Record<string, unknown>) => {
    if (!room) return;
    fetch(`/api/rooms/${room}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload: payload || {} }),
    }).catch(() => {});
  }, [room]);

  useEffect(() => {
    if (!room || !playing) return;
    const iv = setInterval(() => {
      broadcastEvent("heartbeat", { position: progressRef.current, playing: true });
    }, ROOM_HEARTBEAT_INTERVAL);
    return () => clearInterval(iv);
  }, [room, playing, broadcastEvent]);

  useEffect(() => {
    return () => { if (room) getPusherClient().unsubscribe(`room-${room}`); };
  }, [room]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const t = setTimeout(() => setReactions(rs => rs.slice(1)), 2200);
    return () => clearTimeout(t);
  }, [reactions]);

  const startRoom = () => {
    if (!series || !ep) return;
    const code = genRoomCode();
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`room-${code}`);
    channel.bind("reaction", (data: { emoji: string }) => {
      setReactions(rs => [...rs, { id: Date.now() + Math.random(), emoji: data.emoji }]);
    });
    setRoom(code);
    setShowRoomModal(true);
  };

  const stopRoom = () => {
    if (room) getPusherClient().unsubscribe(`room-${room}`);
    setRoom(null);
    setShowRoomModal(false);
    showToast("Listen together session ended", "info");
  };

  const roomLink = () => `${window.location.origin}/listen/${room}?seriesId=${series?._id}&episodeId=${ep?._id}`;

  const copyRoomLink = async () => {
    try { await navigator.clipboard.writeText(roomLink()); showToast("Link copied", "success"); }
    catch { showToast("Couldn't copy link", "error"); }
  };

  const shareRoomLink = async () => {
    const link = roomLink();
    if (navigator.share) {
      try { await navigator.share({ title: "Listen together on Aarvi", url: link }); } catch {}
    } else {
      copyRoomLink();
    }
  };

  // Sleep timer logic
  const startSleep = useCallback((mins: number) => {
    if (sleepRef.current) clearInterval(sleepRef.current);
    setSleepMinutes(mins);
    if (mins === 0) {
      setSleepRemaining(0);
      showToast("Sleep timer off", "info");
      return;
    }
    showToast(`Sleep timer set for ${mins} min`, "success");
    const totalSec = mins * 60;
    setSleepRemaining(totalSec);
    const start = Date.now();
    sleepRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const rem = totalSec - elapsed;
      if (rem <= 0) {
        setSleepRemaining(0);
        setSleepMinutes(0);
        setPlaying(false);
        showToast("Sleep timer ended — playback paused", "info");
        if (sleepRef.current) clearInterval(sleepRef.current);
      } else {
        setSleepRemaining(rem);
      }
    }, 1000);
  }, [setPlaying, showToast]);

  useEffect(() => { return () => { if (sleepRef.current) clearInterval(sleepRef.current); }; }, []);

  // Close expanded on escape
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  const togglePlaying = () => {
    const np = !playing;
    setPlaying(np);
    broadcastEvent(np ? "play" : "pause", { position: progressRef.current });
  };

  const seekTo = (t: number) => {
    setProgress(t);
    if (ref.current) ref.current.currentTime = t;
    broadcastEvent("seek", { position: t });
  };

  const skip = (secs: number) => {
    if (!ref.current) return;
    const t = Math.min(Math.max(ref.current.currentTime + secs, 0), duration);
    ref.current.currentTime = t;
    setProgress(t);
    broadcastEvent("seek", { position: t });
  };

  const handleNext = () => {
    next();
    if (room) {
      const state = usePlayer.getState();
      if (state.ep) broadcastEvent("episode-change", { episodeId: state.ep._id, position: 0 });
    }
  };

  const handlePrev = () => {
    prev();
    if (room) {
      const state = usePlayer.getState();
      if (state.ep) broadcastEvent("episode-change", { episodeId: state.ep._id, position: 0 });
    }
  };

  const sendReaction = (emoji: string) => {
    broadcastEvent("reaction", { emoji });
  };

  // Hidden entirely inside admin, and inside a listen-together session
  // (that page has its own dedicated, host-controlled mini-player).
  const hiddenRoute = path.startsWith("/admin") || path.startsWith("/listen");

  if (hiddenRoute || !ep || dismissed) return <ReactionOverlay reactions={reactions} />;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  const isLiked = series ? (user ? (user.favorites || []).includes(series._id) : liked.includes(series._id)) : false;

  const handleToggleLike = async () => {
    if (!series) return;
    if (!user) { toggleLike(series._id); showToast(isLiked ? "Removed from favorites" : "Saved to favorites", "success"); return; }
    setLikeBusy(true);
    try {
      const res = await fetch(`/api/users/${user._id}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: series._id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't update favorites", "error"); return; }
      setUser({ ...user, favorites: data.favorites });
      showToast(data.favorites.includes(series._id) ? "Saved to favorites" : "Removed from favorites", "success");
    } catch { showToast("Network error — couldn't update favorites", "error"); }
    finally { setLikeBusy(false); }
  };

  return (
    <>
      <audio ref={ref}
        onTimeUpdate={() => ref.current && setProgress(ref.current.currentTime)}
        onLoadedMetadata={() => ref.current && setDuration(ref.current.duration)}
        onEnded={next} preload="metadata"/>

      <ReactionOverlay reactions={reactions} />

      {/* ─── MINI BAR ─── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "var(--surface)", borderTop: "1px solid var(--border2)",
        boxShadow: "0 -4px 30px rgba(0,0,0,.3)",
      }}>
        {room && (
          <div style={{ position: "absolute", top: -28, left: 12, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
            onClick={() => setShowRoomModal(true)}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}/> LIVE · {room}
          </div>
        )}

        {/* Progress track */}
        <div style={{ height: 2, background: "var(--border)", cursor: "pointer", position: "relative" }}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * duration); }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,var(--accent),var(--accent2))", width: `${pct}%`, transition: "width .15s" }}/>
        </div>

        <div className="container" style={{ height: 68, display: "flex", alignItems: "center", gap: 12 }}>
          {/* Art + info */}
          <div onClick={() => setExpanded(true)} style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0, cursor: "pointer" }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, overflow: "hidden", background: "var(--surface2)", flexShrink: 0, position: "relative" }}>
              {series?.coverImage && <img src={series.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
              {playing && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="eq"><span style={{height:8}}/><span/><span/><span style={{height:10}}/></div>
                </div>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep.title}</p>
              <p style={{ fontSize: 11, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{series?.title} · Ep {ep.episodeNumber}</p>
            </div>
          </div>

          {/* Like */}
          <button onClick={handleToggleLike} disabled={likeBusy} title={isLiked ? "Remove from favorites" : "Save to favorites"}
            style={{ background: "none", border: "none", cursor: "pointer", color: isLiked ? "var(--accent2)" : "var(--text3)", padding: 8, display: "flex", borderRadius: 8, flexShrink: 0 }}>
            <Heart size={17} fill={isLiked ? "currentColor" : "none"}/>
          </button>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={handlePrev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 8, display: "flex", borderRadius: 8 }}><SkipBack size={17}/></button>
            <button onClick={togglePlaying} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px var(--accent)44" }}>
              {playing ? <Pause size={16} color="#fff" fill="#fff"/> : <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }}/>}
            </button>
            <button onClick={handleNext} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 8, display: "flex", borderRadius: 8 }}><SkipForward size={17}/></button>
          </div>

          {/* Time */}
          <span className="hide-mobile" style={{ fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>
            {fmt(progress)} / {fmt(duration)}
          </span>

          {/* Speed */}
          <button className="hide-mobile" onClick={() => { const n = (rIdx + 1) % RATES.length; setRIdx(n); setRate(RATES[n]); }}
            style={{ padding: "4px 9px", borderRadius: 6, background: RATES[rIdx] !== 1 ? "var(--accent)" : "var(--surface2)", color: RATES[rIdx] !== 1 ? "#fff" : "var(--text3)", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "var(--ff-mono)", fontWeight: 500 }}>
            {RATES[rIdx]}×
          </button>

          {/* Volume */}
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setMuted(!muted)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex" }}>
              {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
            </button>
            <div style={{ width: 72 }}><input type="range" min={0} max={1} step={.05} value={muted ? 0 : volume} onChange={e => setVolume(+e.target.value)}/></div>
          </div>

          {/* Expand */}
          <button onClick={() => setExpanded(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 8 }}>
            <ChevronUp size={16}/>
          </button>

          {/* Dismiss */}
          <button onClick={() => { setPlaying(false); setDismissed(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 8 }}>
            <X size={16}/>
          </button>
        </div>
      </div>

      {/* ─── FULL PLAYER MODAL ─── */}
      {expanded && (
        <div
          className="full-player-overlay"
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "var(--bg)", overflowY: "auto",
            animation: "slideUp .35s cubic-bezier(.22,1,.36,1) both",
          }}
        >
          {/* Top bar */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            background: "linear-gradient(180deg, var(--bg) 60%, transparent)",
          }}>
            <button onClick={() => setExpanded(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 4 }}>
              <ChevronDown size={24}/>
            </button>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Now Playing
            </p>
            <button onClick={handleToggleLike} disabled={likeBusy} title={isLiked ? "Remove from favorites" : "Save to favorites"}
              style={{ background: "none", border: "none", cursor: "pointer", color: isLiked ? "var(--accent2)" : "var(--text3)", display: "flex", padding: 4 }}>
              <Heart size={22} fill={isLiked ? "currentColor" : "none"}/>
            </button>
          </div>

          {/* Content */}
          <div style={{ maxWidth: 420, margin: "0 auto", padding: "0 24px 120px" }}>
            {/* Cover Art */}
            <div style={{
              width: "100%", aspectRatio: "1", borderRadius: 20, overflow: "hidden",
              background: "var(--surface2)", marginBottom: 32,
              boxShadow: "0 20px 60px rgba(0,0,0,.5)",
            }}>
              {series?.coverImage && (
                <img src={series.coverImage} alt={ep.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              )}
            </div>

            {/* Title & Series */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6, lineHeight: 1.3 }}>{ep.title}</h2>
              <Link href={series ? `/series/${series._id}` : "#"} style={{ fontSize: 14, color: "var(--accent)", textDecoration: "none" }}>
                {series?.title} · Episode {ep.episodeNumber}
              </Link>
            </div>

            {/* Seek bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--surface2)", cursor: "pointer" }}
                onClick={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  seekTo(((e.clientX - r.left) / r.width) * duration);
                }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                  width: `${pct}%`, transition: "width .1s",
                }}/>
                <div style={{
                  position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
                  left: `${pct}%`, width: 16, height: 16, borderRadius: "50%",
                  background: "var(--accent)", boxShadow: "0 0 10px var(--accent)",
                  transition: "left .1s",
                }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text3)" }}>{fmt(progress)}</span>
                <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text3)" }}>{fmt(duration)}</span>
              </div>
            </div>

            {/* Main controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 32 }}>
              {/* Skip -10s */}
              <button onClick={() => skip(-10)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }} title="Back 10s">
                <RotateCcw size={26}/>
                <span style={{ position: "absolute", fontSize: 8, fontWeight: 700, color: "var(--text2)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>10</span>
              </button>

              {/* Prev */}
              <button onClick={handlePrev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", padding: 4 }}>
                <SkipBack size={28} fill="var(--text)"/>
              </button>

              {/* Play/Pause */}
              <button onClick={togglePlaying} style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 24px rgba(124,106,247,.4)",
                transition: "transform .15s, box-shadow .15s",
              }}>
                {playing ? <Pause size={28} color="#fff" fill="#fff"/> : <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 3 }}/>}
              </button>

              {/* Next */}
              <button onClick={handleNext} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", padding: 4 }}>
                <SkipForward size={28} fill="var(--text)"/>
              </button>

              {/* Skip +10s */}
              <button onClick={() => skip(10)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }} title="Forward 10s">
                <RotateCw size={26}/>
                <span style={{ position: "absolute", fontSize: 8, fontWeight: 700, color: "var(--text2)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>10</span>
              </button>
            </div>

            {/* Secondary controls row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-around",
              padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
              marginBottom: 24,
            }}>
              {/* Like */}
              <button
                onClick={handleToggleLike}
                disabled={likeBusy}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                <div style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: isLiked ? "var(--accent2)" : "var(--surface2)",
                  color: isLiked ? "#fff" : "var(--text2)",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Heart size={16} fill={isLiked ? "currentColor" : "none"}/>
                </div>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>{isLiked ? "Saved" : "Save"}</span>
              </button>

              {/* Speed */}
              <button
                onClick={() => { const n = (rIdx + 1) % RATES.length; setRIdx(n); setRate(RATES[n]); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                <div style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: RATES[rIdx] !== 1 ? "var(--accent)" : "var(--surface2)",
                  color: RATES[rIdx] !== 1 ? "#fff" : "var(--text2)",
                  fontSize: 14, fontFamily: "var(--ff-mono)", fontWeight: 600,
                }}>
                  {RATES[rIdx]}×
                </div>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>Speed</span>
              </button>

              {/* Volume */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <button onClick={() => setMuted(!muted)} style={{
                  padding: "6px 14px", borderRadius: 8, background: "var(--surface2)",
                  border: "none", cursor: "pointer", color: muted ? "var(--accent)" : "var(--text2)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                </button>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>
                  {muted ? "Muted" : `${Math.round(volume * 100)}%`}
                </span>
              </div>

              {/* Sleep timer */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowSleepPicker(!showSleepPicker)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    background: "none", border: "none", cursor: "pointer",
                  }}
                >
                  <div style={{
                    padding: "6px 14px", borderRadius: 8,
                    background: sleepMinutes > 0 ? "var(--accent)" : "var(--surface2)",
                    color: sleepMinutes > 0 ? "#fff" : "var(--text2)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Moon size={16}/>
                    {sleepMinutes > 0 && <span style={{ fontSize: 12, fontFamily: "var(--ff-mono)", fontWeight: 600 }}>{fmt(sleepRemaining)}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>Sleep</span>
                </button>

                {/* Sleep picker dropdown */}
                {showSleepPicker && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                    background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 12,
                    padding: 6, minWidth: 130, boxShadow: "0 8px 32px rgba(0,0,0,.5)",
                    animation: "fadeUp .2s ease-out both", zIndex: 10,
                  }}>
                    {SLEEP_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { startSleep(opt.value); setShowSleepPicker(false); }}
                        style={{
                          display: "block", width: "100%", padding: "8px 14px", border: "none",
                          background: sleepMinutes === opt.value ? "var(--accent)22" : "transparent",
                          color: sleepMinutes === opt.value ? "var(--accent)" : "var(--text2)",
                          fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Listen together */}
              <button
                onClick={() => room ? setShowRoomModal(true) : startRoom()}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                <div style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: room ? "var(--accent)" : "var(--surface2)",
                  color: room ? "#fff" : "var(--text2)",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Users size={16}/>
                </div>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>{room ? "Live" : "Together"}</span>
              </button>
            </div>

            {/* Reaction row — only while a room is active */}
            {room && (
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24 }}>
                {REACTIONS.map(e => (
                  <button key={e} onClick={() => sendReaction(e)}
                    style={{ fontSize: 20, background: "var(--surface2)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer" }}>
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Volume slider (full player) */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px" }}>
              <VolumeX size={14} style={{ color: "var(--text3)", flexShrink: 0 }}/>
              <input type="range" min={0} max={1} step={.05} value={muted ? 0 : volume}
                onChange={e => { setVolume(+e.target.value); setMuted(false); }}
                style={{ flex: 1 }}/>
              <Volume2 size={14} style={{ color: "var(--text3)", flexShrink: 0 }}/>
            </div>
          </div>
        </div>
      )}

      {/* ─── Listen together room modal ─── */}
      {showRoomModal && room && (
        <div
          onClick={() => setShowRoomModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div className="card" style={{ padding: 24, width: "100%", maxWidth: 360, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 12, color: "var(--text3)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 10 }}>Listen together</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: 3, marginBottom: 18, fontFamily: "var(--ff-mono)" }}>{room}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={copyRoomLink}><Copy size={13}/>Copy link</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={shareRoomLink}><Share2 size={13}/>Share</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 18 }}>Anyone with this link joins in sync — you stay in control of playback.</p>
            <button className="btn btn-danger btn-sm" style={{ width: "100%" }} onClick={stopRoom}>End session</button>
          </div>
        </div>
      )}
    </>
  );
}
