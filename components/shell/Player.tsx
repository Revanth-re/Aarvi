"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Play, Pause, SkipBack, SkipForward, X, ChevronUp, ChevronDown,
  RotateCcw, RotateCw, Moon, MessageCircle,
} from "lucide-react";
import { usePlayer, useApp, useToast } from "@/store";
import { formatTime } from "@/lib/gamification";
import { Cover } from "@/components/kit";
import ThoughtComposer from "@/components/screens/ThoughtComposer";

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [
  { label: "Off", value: 0 }, { label: "15m", value: 15 },
  { label: "30m", value: 30 }, { label: "45m", value: 45 },
  { label: "End of episode", value: -1 },
];
/** How often playback position is saved for "Continue listening". */
const PROGRESS_SYNC_MS = 12_000;

export default function Player() {
  const path = usePathname();
  const {
    ep, series, playing, progress, duration, volume, rate, seekRequest, sleepMinutes,
    setPlaying, setProgress, setDuration, setRate, clearSeekRequest,
    setSleepMinutes, close, next, prev,
  } = usePlayer();
  const user = useApp(s => s.user);
  const autoplayNext = useApp(s => s.settings.playback.autoplayNext);
  const fadeOnSleep = useApp(s => s.settings.playback.fadeOnSleep);
  const showToast = useToast(s => s.show);

  const audio = useRef<HTMLAudioElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sleepLeft, setSleepLeft] = useState(0);
  const progressRef = useRef(progress);

  useEffect(() => { progressRef.current = progress; }, [progress]);

  // Shorts owns its own <audio>; two transport UIs over one screen
  // would let the user drive two sources at once.
  const hidden = path.startsWith("/admin") || path.startsWith("/shorts");

  // ── Load / play / rate ──
  useEffect(() => {
    if (!audio.current || !ep) return;
    audio.current.src = ep.audioUrl;
    audio.current.load();
    if (playing) audio.current.play().catch(() => setPlaying(false));
  }, [ep?._id]);

  useEffect(() => {
    if (!audio.current) return;
    if (playing) audio.current.play().catch(() => setPlaying(false));
    else audio.current.pause();
  }, [playing, setPlaying]);

  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  useEffect(() => { if (audio.current) audio.current.playbackRate = rate; }, [rate]);

  // ── One-shot seek (thought "jump to moment", scrubbing) ──
  useEffect(() => {
    if (seekRequest === null || !audio.current) return;
    audio.current.currentTime = seekRequest;
    setProgress(seekRequest);
    clearSeekRequest();
  }, [seekRequest, setProgress, clearSeekRequest]);

  // ── Sleep timer ──
  useEffect(() => {
    if (sleepMinutes <= 0) return;

    // Seeded on the first tick rather than synchronously in the effect
    // body, which would trigger a cascading render.
    let seeded = false;

    const id = setInterval(() => {
      if (!seeded) { seeded = true; setSleepLeft(sleepMinutes * 60); return; }
      setSleepLeft(prev => {
        if (prev <= 1) {
          // "Fade out on sleep timer" ramps the volume down instead of
          // cutting mid-word, which is jarring if you're still awake.
          const a = audio.current;
          if (a && fadeOnSleep) {
            const from = a.volume;
            const step = from / 12;
            const fade = setInterval(() => {
              if (!a || a.volume <= step) {
                clearInterval(fade);
                if (a) { a.pause(); a.volume = from; }
                setPlaying(false);
              } else {
                a.volume = Math.max(0, a.volume - step);
              }
            }, 220);
          } else {
            setPlaying(false);
          }
          setSleepMinutes(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [sleepMinutes, fadeOnSleep, setPlaying, setSleepMinutes]);

  // ── Save position for "Continue listening" ──
  useEffect(() => {
    if (!ep || !series || !user || !playing) return;
    const save = () => {
      fetch(`/api/users/${user._id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: series._id, episodeId: ep._id, position: progressRef.current }),
      }).catch(() => {});
    };
    const id = setInterval(save, PROGRESS_SYNC_MS);
    return () => { save(); clearInterval(id); };
  }, [ep?._id, series?._id, user?._id, playing]);

  const onEnded = useCallback(() => {
    // "End of episode" sleep timer stops here rather than rolling on.
    if (sleepMinutes === -1) { setPlaying(false); setSleepMinutes(0); return; }
    if (autoplayNext) next();
    else setPlaying(false);
  }, [autoplayNext, next, setPlaying, sleepMinutes, setSleepMinutes]);

  const seekBy = (d: number) => {
    if (!audio.current) return;
    const t = Math.max(0, Math.min(duration || 0, audio.current.currentTime + d));
    audio.current.currentTime = t;
    setProgress(t);
  };

  if (hidden || !ep || !series) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const noAudio = !ep.audioUrl;

  return (
    <>
      <audio
        ref={audio}
        onTimeUpdate={() => audio.current && setProgress(audio.current.currentTime)}
        onLoadedMetadata={() => audio.current && setDuration(audio.current.duration || 0)}
        onEnded={onEnded}
        onError={() => { if (!noAudio) showToast("Couldn't load that audio", "error"); setPlaying(false); }}
        preload="metadata"
      />

      {/* ── Mini bar, sits directly above the tab bar ── */}
      <div className="player-bar" style={{
        background: "var(--surface)", borderTop: "1px solid var(--border)",
        boxShadow: "0 -4px 24px rgba(0,0,0,.10)",
      }}>
        <div className="progress-track" style={{ height: 2, borderRadius: 0 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, borderRadius: 0 }}/>
        </div>

        <div style={{ height: 62, display: "flex", alignItems: "center", gap: 10, padding: "0 12px" }}>
          <button onClick={() => setExpanded(true)} aria-label="Open player"
            style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Cover id={series._id} url={series.coverImage} size={42} radius={10}/>
            <span style={{ minWidth: 0, textAlign: "left" }}>
              <span className="truncate" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                {ep.title}
              </span>
              <span className="truncate" style={{ display: "block", fontSize: 11, color: "var(--text3)" }}>
                {noAudio ? "No audio file attached" : series.title}
              </span>
            </span>
          </button>

          <button onClick={() => setPlaying(!playing)} disabled={noAudio}
            aria-label={playing ? "Pause" : "Play"}
            style={{
              width: 40, height: 40, borderRadius: "50%", border: "none",
              background: "var(--grad)", color: "#fff", flex: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: noAudio ? "default" : "pointer", opacity: noAudio ? .5 : 1,
            }}>
            {playing ? <Pause size={17} fill="#fff"/> : <Play size={17} fill="#fff"/>}
          </button>

          <button onClick={close} aria-label="Close player"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", flex: "none" }}>
            <X size={17}/>
          </button>
        </div>
      </div>

      {/* ── Full player ── */}
      {expanded && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300, background: "var(--bg)",
          maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column",
          padding: "14px 20px 28px", overflowY: "auto",
        }} className="anim-in">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => setExpanded(false)} aria-label="Minimise"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex" }}>
              <ChevronDown size={24}/>
            </button>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              EP {ep.episodeNumber} · {series.title}
            </span>
            <button onClick={() => setSleepOpen(v => !v)} aria-label="Sleep timer"
              style={{ background: "none", border: "none", cursor: "pointer", color: sleepLeft ? "var(--accent)" : "var(--text2)", display: "flex" }}>
              <Moon size={20}/>
            </button>
          </div>

          {sleepOpen && (
            <div className="card" style={{ padding: 12, marginTop: 12, display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SLEEP_OPTIONS.map(o => (
                <button key={o.label} className="chip"
                  data-active={sleepMinutes === o.value}
                  onClick={() => { setSleepMinutes(o.value); setSleepOpen(false); }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ margin: "26px auto 22px", width: "min(280px, 72vw)" }}>
            <Cover id={series._id} url={series.coverImage} size={280} radius={24}/>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>{ep.title}</h2>
          <p style={{ fontSize: 13.5, color: "var(--text3)", margin: "0 0 20px" }}>{series.narrator || series.title}</p>

          {sleepLeft > 0 && (
            <p style={{ fontSize: 12, color: "var(--accent)", margin: "0 0 12px" }}>
              Sleeping in {formatTime(sleepLeft)}
            </p>
          )}

          <input
            type="range" min={0} max={duration || 0} value={progress}
            onChange={e => {
              const t = Number(e.target.value);
              if (audio.current) audio.current.currentTime = t;
              setProgress(t);
            }}
            aria-label="Seek"
            style={{ width: "100%", accentColor: "var(--accent)" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 18 }}>
            <span>{formatTime(progress)}</span><span>{formatTime(duration || 0)}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
            <button onClick={prev} aria-label="Previous" style={iconBtn}><SkipBack size={22}/></button>
            <button onClick={() => seekBy(-15)} aria-label="Back 15 seconds" style={iconBtn}><RotateCcw size={20}/></button>
            <button onClick={() => setPlaying(!playing)} disabled={noAudio}
              aria-label={playing ? "Pause" : "Play"}
              style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: "var(--grad)", color: "#fff", cursor: noAudio ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", opacity: noAudio ? .5 : 1,
              }}>
              {playing ? <Pause size={26} fill="#fff"/> : <Play size={26} fill="#fff"/>}
            </button>
            <button onClick={() => seekBy(30)} aria-label="Forward 30 seconds" style={iconBtn}><RotateCw size={20}/></button>
            <button onClick={next} aria-label="Next" style={iconBtn}><SkipForward size={22}/></button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
            <button
              onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
              className="btn btn-soft btn-sm">
              {rate}×
            </button>

            {/* Leaving a thought is a first-class player action — that's
                what makes them timestamped rather than generic comments. */}
            <button onClick={() => setComposerOpen(true)} className="btn btn-soft btn-sm">
              <MessageCircle size={14}/> Leave a thought at {formatTime(progress)}
            </button>
          </div>

          {noAudio && (
            <p style={{ fontSize: 12, color: "var(--warning)", marginTop: 18, lineHeight: 1.6 }}>
              This episode has no audio file attached yet. Add one in
              Admin → Audio Series and playback will work.
            </p>
          )}

          <Link href={`/series/${series._id}`} onClick={() => setExpanded(false)}
            style={{ fontSize: 12.5, color: "var(--accent)", textDecoration: "none", marginTop: 20 }}>
            View all episodes <ChevronUp size={12} style={{ transform: "rotate(90deg)" }}/>
          </Link>
        </div>
      )}

      <ThoughtComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        seriesId={series._id}
        episodeId={ep._id}
        atSec={Math.floor(progress)}
      />
    </>
  );
}

const iconBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "var(--text2)", display: "flex",
};
