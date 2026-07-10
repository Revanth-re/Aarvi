"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Series, Episode } from "@/types";
import { getPusherClient } from "@/lib/pusherClient";
import ReactionOverlay from "@/components/ui/ReactionOverlay";
import { Play, Pause, Radio, ArrowLeft } from "lucide-react";

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }

const REACTIONS = ["❤️", "😂", "😮", "🔥", "👏"];

export default function ListenRoomClient() {
  const { code } = useParams() as { code: string };
  const searchParams = useSearchParams();
  const seriesId = searchParams.get("seriesId") || "";
  const episodeId = searchParams.get("episodeId") || "";

  const [series, setSeries] = useState<Series | null>(null);
  const [ep, setEp] = useState<Episode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [connected, setConnected] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const seriesRef = useRef<Series | null>(null);

  useEffect(() => { seriesRef.current = series; }, [series]);

  useEffect(() => {
    if (!seriesId) return;
    fetch(`/api/series/${seriesId}`)
      .then(r => r.json())
      .then(d => {
        setSeries(d);
        const found = d.episodes?.find((e: Episode) => e._id === episodeId) || d.episodes?.[0] || null;
        setEp(found);
      })
      .catch(() => {});
  }, [seriesId, episodeId]);

  useEffect(() => {
    if (!code) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`room-${code}`);
    setConnected(true);

    channel.bind("play", (data: { position: number }) => {
      if (audioRef.current) { audioRef.current.currentTime = data.position; audioRef.current.play().catch(() => {}); }
      setPlaying(true);
    });
    channel.bind("pause", (data: { position: number }) => {
      if (audioRef.current) { audioRef.current.currentTime = data.position; audioRef.current.pause(); }
      setPlaying(false);
    });
    channel.bind("seek", (data: { position: number }) => {
      if (audioRef.current) audioRef.current.currentTime = data.position;
      setProgress(data.position);
    });
    channel.bind("heartbeat", (data: { position: number }) => {
      if (audioRef.current && Math.abs(audioRef.current.currentTime - data.position) > 2) {
        audioRef.current.currentTime = data.position;
      }
    });
    channel.bind("episode-change", (data: { episodeId: string }) => {
      const found = seriesRef.current?.episodes?.find(e => e._id === data.episodeId);
      if (found) { setEp(found); setProgress(0); }
    });
    channel.bind("reaction", (data: { emoji: string }) => {
      setReactions(rs => [...rs, { id: Date.now() + Math.random(), emoji: data.emoji }]);
    });

    return () => { pusher.unsubscribe(`room-${code}`); };
  }, [code]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const t = setTimeout(() => setReactions(rs => rs.slice(1)), 2200);
    return () => clearTimeout(t);
  }, [reactions]);

  const sendReaction = (emoji: string) => {
    fetch(`/api/rooms/${code}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "reaction", payload: { emoji } }),
    }).catch(() => {});
  };

  if (!series || !ep) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--text3)", fontSize: 14 }}>Joining session…</p>
      </div>
    );
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <audio ref={audioRef} src={ep.audioUrl} preload="metadata"
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} />

      <Link href="/" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13, marginBottom: 24 }}>
        <ArrowLeft size={14} />Leave session
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 20 }}>
        <Radio size={12} /> {connected ? `LIVE · ${code}` : "Connecting…"}
      </div>

      <div style={{ width: "100%", maxWidth: 340, aspectRatio: "1", borderRadius: 20, overflow: "hidden", background: "var(--surface2)", marginBottom: 24, boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        {series.coverImage && <img src={series.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4, textAlign: "center" }}>{ep.title}</h1>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>{series.title} · Episode {ep.episodeNumber}</p>

      <div style={{ width: "100%", maxWidth: 340, marginBottom: 8 }}>
        <div style={{ height: 5, borderRadius: 3, background: "var(--surface2)" }}>
          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: "linear-gradient(90deg,var(--accent),var(--accent2))", transition: "width .2s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text3)" }}>{fmt(progress)}</span>
          <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text3)" }}>{fmt(duration)}</span>
        </div>
      </div>

      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        {playing ? <Pause size={22} color="var(--text2)" fill="var(--text2)" /> : <Play size={22} color="var(--text2)" fill="var(--text2)" style={{ marginLeft: 3 }} />}
      </div>
      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 28 }}>Playback is controlled by the host</p>

      <div style={{ display: "flex", gap: 10 }}>
        {REACTIONS.map(e => (
          <button key={e} onClick={() => sendReaction(e)}
            style={{ fontSize: 20, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "50%", width: 44, height: 44, cursor: "pointer" }}>
            {e}
          </button>
        ))}
      </div>

      <ReactionOverlay reactions={reactions} />
    </div>
  );
}
