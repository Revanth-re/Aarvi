"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePlayer } from "@/store";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X,
  ChevronUp, ChevronDown, RotateCcw, RotateCw, Moon, Timer
} from "lucide-react";

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

export default function MiniPlayer() {
  const { ep, series, playing, progress, duration, volume, rate, setPlaying, setProgress, setDuration, setVolume, setRate, next, prev } = usePlayer();
  const ref = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [rIdx, setRIdx] = useState(1);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const sleepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (ep) setDismissed(false); }, [ep?._id]);
  useEffect(() => { if (!ref.current || !ep) return; ref.current.src = ep.audioUrl; ref.current.load(); if (playing) ref.current.play().catch(() => {}); }, [ep?._id]);
  useEffect(() => { if (!ref.current) return; playing ? ref.current.play().catch(() => {}) : ref.current.pause(); }, [playing]);
  useEffect(() => { if (ref.current) ref.current.volume = muted ? 0 : volume; }, [volume, muted]);
  useEffect(() => { if (ref.current) (ref.current as any).playbackRate = rate; }, [rate]);

  // Sleep timer logic
  const startSleep = useCallback((mins: number) => {
    if (sleepRef.current) clearInterval(sleepRef.current);
    setSleepMinutes(mins);
    if (mins === 0) { setSleepRemaining(0); return; }
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
        if (sleepRef.current) clearInterval(sleepRef.current);
      } else {
        setSleepRemaining(rem);
      }
    }, 1000);
  }, [setPlaying]);

  useEffect(() => { return () => { if (sleepRef.current) clearInterval(sleepRef.current); }; }, []);

  // Close expanded on escape
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  const skip = (secs: number) => {
    if (!ref.current) return;
    const t = Math.min(Math.max(ref.current.currentTime + secs, 0), duration);
    ref.current.currentTime = t;
    setProgress(t);
  };

  if (!ep || dismissed) return null;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <audio ref={ref}
        onTimeUpdate={() => ref.current && setProgress(ref.current.currentTime)}
        onLoadedMetadata={() => ref.current && setDuration(ref.current.duration)}
        onEnded={next} preload="metadata"/>

      {/* ─── MINI BAR ─── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "var(--surface)", borderTop: "1px solid var(--border2)",
        boxShadow: "0 -4px 30px rgba(0,0,0,.3)",
      }}>
        {/* Progress track */}
        <div style={{ height: 2, background: "var(--border)", cursor: "pointer", position: "relative" }}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const t = ((e.clientX - r.left) / r.width) * duration; setProgress(t); if (ref.current) ref.current.currentTime = t; }}>
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

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={prev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 8, display: "flex", borderRadius: 8 }}><SkipBack size={17}/></button>
            <button onClick={() => setPlaying(!playing)} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px var(--accent)44" }}>
              {playing ? <Pause size={16} color="#fff" fill="#fff"/> : <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }}/>}
            </button>
            <button onClick={next} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 8, display: "flex", borderRadius: 8 }}><SkipForward size={17}/></button>
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
            <div style={{ width: 32 }}/>
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
                  const t = ((e.clientX - r.left) / r.width) * duration;
                  setProgress(t);
                  if (ref.current) ref.current.currentTime = t;
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
              <button onClick={prev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", padding: 4 }}>
                <SkipBack size={28} fill="var(--text)"/>
              </button>

              {/* Play/Pause */}
              <button onClick={() => setPlaying(!playing)} style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 24px rgba(124,106,247,.4)",
                transition: "transform .15s, box-shadow .15s",
              }}>
                {playing ? <Pause size={28} color="#fff" fill="#fff"/> : <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 3 }}/>}
              </button>

              {/* Next */}
              <button onClick={next} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", padding: 4 }}>
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
            </div>

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
    </>
  );
}

