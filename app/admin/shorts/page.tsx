"use client";
import { useEffect, useState } from "react";
import { Clapperboard, Plus, Trash2 } from "lucide-react";
import { Series, Episode, ShortFeedItem } from "@/types";
import { adminFetch } from "@/lib/adminFetch";
import { useToast } from "@/store";

// Admin screen for cutting Shorts out of existing episodes.
//
// There's no upload here on purpose — a Short is a start/end range into
// audio you already have, so creating one is just picking a series, an
// episode, and two timestamps.

function parseTime(v: string): number | null {
  // Accepts "83", "1:23" or "01:23".
  const t = v.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const m = t.match(/^(\d+):([0-5]?\d)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function AdminShortsPage() {
  const showToast = useToast(s => s.show);

  const [series, setSeries] = useState<Series[]>([]);
  const [shorts, setShorts] = useState<ShortFeedItem[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [start, setStart] = useState("0:00");
  const [end, setEnd] = useState("0:30");
  const [caption, setCaption] = useState("");
  const [handle, setHandle] = useState("@aarvi");
  const [saving, setSaving] = useState(false);

  const loadShorts = () =>
    fetch("/api/shorts?limit=50")
      .then(r => r.json())
      .then(d => setShorts(Array.isArray(d) ? d : []))
      .catch(() => {});

  useEffect(() => {
    fetch("/api/series?limit=100")
      .then(r => r.json())
      .then(d => setSeries(Array.isArray(d) ? d : []))
      .catch(() => {});
    loadShorts();
  }, []);

  // The list endpoint strips transcripts but keeps episodes, so the
  // episode dropdown can be filled without another request.
  const episodes: Episode[] = series.find(s => s._id === seriesId)?.episodes ?? [];

  const create = async () => {
    const startSec = parseTime(start);
    const endSec = parseTime(end);

    if (!seriesId || !episodeId) { showToast("Pick a series and episode", "error"); return; }
    if (startSec === null || endSec === null) {
      showToast("Times must look like 0:30 or 45", "error"); return;
    }
    if (endSec <= startSec) { showToast("End must be after start", "error"); return; }
    if (endSec - startSec > 90) {
      showToast("Keep shorts under 90 seconds", "error"); return;
    }

    setSaving(true);
    try {
      const r = await adminFetch("/api/shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId, episodeId, startSec, endSec,
          caption: caption.trim(),
          creatorHandle: handle.trim() || "@aarvi",
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't create short", "error"); return; }

      showToast("Short created", "success");
      setCaption("");
      loadShorts();
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: "var(--accent)18",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Clapperboard size={15} color="var(--accent)"/>
        </div>
        <h1 className="section-title" style={{ fontSize: 20 }}>Shorts</h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24, lineHeight: 1.6 }}>
        A short is a clip cut from an episode you&apos;ve already uploaded —
        pick the moment and it appears in the Shorts feed. No new audio file
        is created or stored.
      </p>

      {/* ── Create form ── */}
      <div className="card" style={{ padding: 18, marginBottom: 28 }}>
        <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label className="label">Series</label>
            <select className="inp" value={seriesId}
              onChange={e => { setSeriesId(e.target.value); setEpisodeId(""); }}>
              <option value="">Select a series…</option>
              {series.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Episode</label>
            <select className="inp" value={episodeId} disabled={!seriesId}
              onChange={e => setEpisodeId(e.target.value)}>
              <option value="">Select an episode…</option>
              {episodes.map(ep => (
                <option key={ep._id} value={ep._id}>
                  EP {ep.episodeNumber} — {ep.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Start (m:ss)</label>
            <input className="inp" value={start} onChange={e => setStart(e.target.value)} placeholder="0:00"/>
          </div>
          <div>
            <label className="label">End (m:ss)</label>
            <input className="inp" value={end} onChange={e => setEnd(e.target.value)} placeholder="0:30"/>
          </div>
          <div>
            <label className="label">Caption</label>
            <input className="inp" value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="The hook that makes someone stop scrolling"/>
          </div>
          <div>
            <label className="label">Creator handle</label>
            <input className="inp" value={handle} onChange={e => setHandle(e.target.value)} placeholder="@aarvi"/>
          </div>
        </div>

        <button onClick={create} disabled={saving} className="btn btn-primary" style={{ marginTop: 16 }}>
          <Plus size={15}/>{saving ? "Creating…" : "Create short"}
        </button>
      </div>

      {/* ── Existing ── */}
      <h2 className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>
        Existing shorts ({shorts.length})
      </h2>

      {shorts.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          None yet — create the first one above.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shorts.map(s => (
            <div key={s._id} className="card" style={{
              padding: 12, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flex: "none", background: s.gradient,
              }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {s.caption || s.episodeTitle || "Untitled clip"}
                </div>
                <div className="truncate" style={{ fontSize: 11.5, color: "var(--text3)" }}>
                  {s.seriesTitle} · {fmt(s.startSec)}–{fmt(s.endSec)} · {s.creatorHandle}
                </div>
              </div>
              <span className="badge badge-muted">{s.likeCount} likes</span>
            </div>
          ))}
        </div>
      )}

      {/* Deletion intentionally left out for now: the API has no DELETE
          route yet, and shipping a button that 404s would be worse than
          not shipping one. Add /api/shorts/[id] DELETE and wire this up. */}
      <p style={{
        fontSize: 11.5, color: "var(--text3)", marginTop: 20,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <Trash2 size={12}/> Deleting shorts isn&apos;t wired up yet — say the word and I&apos;ll add it.
      </p>
    </div>
  );
}
