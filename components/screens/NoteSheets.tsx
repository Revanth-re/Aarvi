"use client";
import { useEffect, useRef, useState } from "react";
import { X, Music, Headphones, Loader2, Play, Pause } from "lucide-react";
import { Series, UserNote } from "@/types";
import { usePlayer, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";

/* eslint-disable @next/next/no-img-element */

export const NOTE_BGS = [
  "var(--surface2)", "linear-gradient(135deg,#f58529,#dd2a7b,#8134af)", "linear-gradient(135deg,#4f5bd5,#00c6ff)",
  "linear-gradient(135deg,#11998e,#38ef7d)", "linear-gradient(135deg,#ff512f,#f09819)", "#111", "#e11d48", "#7c3aed",
];
const isDark = (bg?: string) => !!bg && bg !== "var(--surface2)";
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const CLIP_MAX = 30;

/** Plays only [start, end] of a track, looping — the Instagram note preview. */
export function ClipPlayer({ src, start, end, autoPlay, label }: { src: string; start: number; end?: number; autoPlay?: boolean; label?: string }) {
  const a = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [t, setT] = useState(start);
  const stop = end && end > start ? end : start + CLIP_MAX;
  useEffect(() => {
    const el = a.current; if (!el) return;
    el.currentTime = start;
    if (autoPlay) el.play().then(() => setOn(true)).catch(() => {});
  }, [src, start, stop, autoPlay]);
  useEffect(() => () => a.current?.pause(), []);
  const toggle = () => {
    const el = a.current; if (!el) return;
    if (on) { el.pause(); setOn(false); return; }
    if (el.currentTime < start || el.currentTime >= stop) el.currentTime = start;
    el.play().then(() => setOn(true)).catch(() => {});
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 14, background: "var(--surface2)" }}>
      <audio ref={a} src={src} preload="auto" onLoadedMetadata={e => { e.currentTarget.currentTime = start; }}
        onTimeUpdate={e => { const el = e.currentTarget; if (el.currentTime >= stop) el.currentTime = start; setT(el.currentTime); }}
        onPause={() => setOn(false)} onPlay={() => setOn(true)}/>
      <button onClick={toggle} aria-label={on ? "Pause" : "Play"} style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", border: "none", background: "var(--grad)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {on ? <Pause size={15}/> : <Play size={15}/>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && <span className="truncate" style={{ display: "block", fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>{label}</span>}
        <div style={{ height: 4, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "var(--accent)", width: `${Math.min(100, Math.max(0, ((t - start) / (stop - start)) * 100))}%` }}/>
        </div>
      </div>
      <span style={{ fontSize: 11, color: "var(--text3)", flex: "none" }}>{fmt(start)}–{fmt(stop)}</span>
    </div>
  );
}

/** Start/end pickers for a clip of up to CLIP_MAX seconds. */
function ClipRange({ dur, start, end, onChange }: { dur: number; start: number; end?: number; onChange: (s: number, e: number) => void }) {
  const max = Math.max(dur, 1);
  const e = end && end > start ? end : Math.min(start + CLIP_MAX, max);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text2)" }}>
      <span>Starts at {fmt(start)}</span>
      <input type="range" min={0} max={Math.max(max - 1, 0)} value={start}
        onChange={ev => { const s = Number(ev.target.value); onChange(s, Math.min(Math.max(e, s + 1), s + CLIP_MAX, max)); }}/>
      <span>Ends at {fmt(e)} ({Math.round(e - start)}s, max {CLIP_MAX}s)</span>
      <input type="range" min={Math.min(start + 1, max)} max={Math.min(start + CLIP_MAX, max)} value={e}
        onChange={ev => onChange(start, Number(ev.target.value))}/>
    </div>
  );
}

/** Short label for the bubble above an avatar. */
export function noteLabel(n?: UserNote | null) {
  if (!n) return "";
  return n.text || (n.musicName ? `🎵 ${n.musicName}` : n.ep ? `🎧 ${n.ep.title}` : "🎵");
}
export function NoteBubble({ note, fallback, onClick, max = 90 }: { note?: UserNote | null; fallback?: string; onClick?: (e: React.MouseEvent) => void; max?: number }) {
  const bg = note?.bg || "var(--surface2)";
  return (
    <span onClick={onClick} style={{
      maxWidth: max, padding: "4px 9px", borderRadius: 14, background: bg, border: "1px solid var(--border)",
      fontSize: 10.5, color: note ? (isDark(bg) ? "#fff" : "var(--text)") : "var(--text3)", whiteSpace: "nowrap",
      overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", cursor: "pointer",
    }}>{note ? noteLabel(note) : fallback}</span>
  );
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" };
const panel: React.CSSProperties = { width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", background: "var(--bg)", borderRadius: "22px 22px 0 0", padding: "18px 16px calc(18px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 14 };
const chip = (on: boolean): React.CSSProperties => ({ padding: "7px 12px", borderRadius: 999, border: "1px solid var(--border)", background: on ? "var(--grad)" : "var(--surface2)", color: on ? "#fff" : "var(--text)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" });

/** View someone's note: text, music, and an episode clip you can play from its moment. */
export function NoteViewer({ note, name, onClose, onEdit }: { note: UserNote; name: string; onClose: () => void; onEdit?: () => void }) {
  const setEp = usePlayer(s => s.setEp);
  const requestSeek = usePlayer(s => s.requestSeek);
  const showToast = useToast(s => s.show);
  const playEp = async () => {
    if (!note.ep) return;
    try {
      const s: Series = await (await fetch(`/api/series/${note.ep.seriesId}`)).json();
      const ep = s.episodes?.find(e => e._id === note.ep!.episodeId);
      if (!ep) throw 0;
      setEp(ep, s);
      setTimeout(() => requestSeek(note.ep!.start), 500);
      onClose();
    } catch { showToast("Episode not available", "error"); }
  };
  const bg = note.bg || "var(--surface2)";
  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ color: "var(--text)" }}>{name === "Your" ? "Your note" : `${name}'s note`}</b>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer" }}><X size={20}/></button>
        </div>
        {!!note.text && (
          <div style={{ background: bg, color: isDark(bg) ? "#fff" : "var(--text)", borderRadius: 18, padding: "22px 16px", textAlign: "center", fontSize: 17, fontWeight: 600 }}>{note.text}</div>
        )}
        {!!note.musicUrl && (
          <ClipPlayer src={note.musicUrl} start={note.musicStart || 0} end={note.musicEnd} autoPlay label={`🎵 ${note.musicName || "Music"}`}/>
        )}
        {!!note.ep?.audioUrl && (
          <ClipPlayer src={note.ep.audioUrl} start={note.ep.start} end={note.ep.end} autoPlay={!note.musicUrl} label={`🎧 ${note.ep.title}`}/>
        )}
        {!!note.ep && (
          <button onClick={playEp} style={{ display: "flex", gap: 12, alignItems: "center", padding: 10, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface2)", cursor: "pointer", textAlign: "left" }}>
            {note.ep.cover ? <img src={note.ep.cover} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover" }}/> : <Headphones size={28}/>}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="truncate" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{note.ep.title}</span>
              <span className="truncate" style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>{note.ep.seriesTitle}</span>
            </span>
            <span style={{ ...chip(true), display: "flex", gap: 4, alignItems: "center" }}><Play size={12}/>Full ep</span>
          </button>
        )}
        {onEdit && <button className="btn" onClick={onEdit}>Edit note</button>}
      </div>
    </div>
  );
}

/** Create/edit your note: quote/text, background, music upload, episode + start time. */
export function NoteComposer({ userId, initial, onClose, onSaved }: { userId: string; initial?: UserNote | null; onClose: () => void; onSaved: (n: UserNote | null) => void }) {
  const showToast = useToast(s => s.show);
  const [n, setN] = useState<UserNote>(initial ?? {});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Series[]>([]);
  const [pick, setPick] = useState<Series | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/series?limit=12${q.trim() ? `&search=${encodeURIComponent(q.trim())}` : ""}`)
        .then(r => r.json()).then(d => Array.isArray(d) && setResults(d)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const upload = async (f: File) => {
    if (!f.type.startsWith("audio/")) { showToast("Choose an audio file", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await creatorFetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "Upload failed");
      setN(p => ({ ...p, musicUrl: d.url, musicName: f.name.replace(/\.[^.]+$/, "").slice(0, 80), musicStart: 0, musicEnd: undefined }));
    } catch (e) { showToast(e instanceof Error ? e.message : "Upload failed", "error"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const save = async (clear = false) => {
    setSaving(true);
    try {
      const r = await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, note: clear ? {} : n }) });
      const d = await r.json();
      if (!r.ok) throw 0;
      onSaved(d.note); onClose();
    } catch { showToast("Couldn't save note", "error"); } finally { setSaving(false); }
  };

  const [musicDur, setMusicDur] = useState(0);
  useEffect(() => {
    if (!n.musicUrl) return;
    const el = new Audio(n.musicUrl);
    el.onloadedmetadata = () => { if (Number.isFinite(el.duration)) setMusicDur(Math.floor(el.duration)); };
  }, [n.musicUrl]);
  const [epAudioDur, setEpAudioDur] = useState(0);
  useEffect(() => {
    if (!n.ep?.audioUrl) return;
    const el = new Audio(n.ep.audioUrl);
    el.onloadedmetadata = () => { if (Number.isFinite(el.duration)) setEpAudioDur(Math.floor(el.duration)); };
  }, [n.ep?.audioUrl]);
  const epDur = pick?.episodes?.find(e => e._id === n.ep?.episodeId)?.duration || epAudioDur;
  const bg = n.bg || "var(--surface2)";

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ color: "var(--text)" }}>Your note</b>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer" }}><X size={20}/></button>
        </div>

        <div style={{ background: bg, borderRadius: 18, padding: 18 }}>
          <input value={n.text ?? ""} maxLength={60} onChange={e => setN(p => ({ ...p, text: e.target.value }))} placeholder="Share a thought or quote…"
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", textAlign: "center", fontSize: 17, fontWeight: 600, color: isDark(bg) ? "#fff" : "var(--text)" }}/>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {NOTE_BGS.map(c => (
            <button key={c} onClick={() => setN(p => ({ ...p, bg: c }))} aria-label="Background"
              style={{ width: 30, height: 30, flex: "none", borderRadius: "50%", background: c, cursor: "pointer", border: (n.bg || NOTE_BGS[0]) === c ? "3px solid var(--accent)" : "1px solid var(--border)" }}/>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}/>
          <button style={{ ...chip(!!n.musicUrl), display: "flex", gap: 6, alignItems: "center" }} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={14} className="spin"/> : <Music size={14}/>}{n.musicUrl ? "Change music" : "Add music"}
          </button>
          {n.musicUrl && <span className="truncate" style={{ flex: 1, fontSize: 12, color: "var(--text2)" }}>{n.musicName}</span>}
          {n.musicUrl && <button onClick={() => setN(p => ({ ...p, musicUrl: undefined, musicName: undefined }))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={16}/></button>}
        </div>
        {n.musicUrl && (
          <>
            <ClipRange dur={musicDur} start={n.musicStart || 0} end={n.musicEnd} onChange={(s, e) => setN(p => ({ ...p, musicStart: s, musicEnd: e }))}/>
            <ClipPlayer src={n.musicUrl} start={n.musicStart || 0} end={n.musicEnd} label="Preview"/>
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", display: "flex", gap: 6, alignItems: "center" }}><Headphones size={14}/>Share an episode moment</span>
          {n.ep ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 14, background: "var(--surface2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span className="truncate" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{n.ep.title} · {n.ep.seriesTitle}</span>
                <button onClick={() => setN(p => ({ ...p, ep: undefined }))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={16}/></button>
              </div>
              <ClipRange dur={Math.max(epDur, n.ep.end || 0)} start={n.ep.start} end={n.ep.end}
                onChange={(s, e) => setN(p => ({ ...p, ep: { ...p.ep!, start: s, end: e } }))}/>
              {n.ep.audioUrl && <ClipPlayer src={n.ep.audioUrl} start={n.ep.start} end={n.ep.end} label="Preview"/>}
            </div>
          ) : (
            <>
              <input className="inp" value={q} onChange={e => { setQ(e.target.value); setPick(null); }} placeholder="Search series…" style={{ padding: "9px 14px" }}/>
              {!pick ? (
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                  {results.map(s => (
                    <button key={s._id} onClick={() => setPick(s)} style={{ flex: "none", width: 84, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                      {s.coverImage ? <img src={s.coverImage} alt="" style={{ width: 84, height: 84, borderRadius: 12, objectFit: "cover" }}/> : <div style={{ width: 84, height: 84, borderRadius: 12, background: "var(--grad)" }}/>}
                      <span className="truncate" style={{ display: "block", fontSize: 11, color: "var(--text)", marginTop: 4 }}>{s.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => setPick(null)} style={{ ...chip(false), alignSelf: "flex-start" }}>← {pick.title}</button>
                  {(pick.episodes || []).map(ep => (
                    <button key={ep._id} onClick={() => setN(p => ({ ...p, ep: { seriesId: pick._id!, seriesTitle: pick.title, episodeId: ep._id, title: ep.title, cover: pick.coverImage, audioUrl: ep.audioUrl, start: 0, end: Math.min(CLIP_MAX, ep.duration || CLIP_MAX) } }))}
                      style={{ ...chip(false), textAlign: "left", borderRadius: 12 }}>
                      Ep {ep.episodeNumber} · {ep.title} <span style={{ color: "var(--text3)" }}>({fmt(ep.duration || 0)})</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {initial && <button className="btn" style={{ flex: 1, background: "var(--surface2)", color: "var(--text)" }} disabled={saving} onClick={() => save(true)}>Delete</button>}
          <button className="btn" style={{ flex: 2 }} disabled={saving || uploading || !(n.text?.trim() || n.musicUrl || n.ep)} onClick={() => save()}>
            {saving ? "Sharing…" : "Share note"}
          </button>
        </div>
        <span style={{ fontSize: 11, color: "var(--text3)", textAlign: "center" }}>Notes disappear after 24 hours.</span>
      </div>
    </div>
  );
}
