"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clapperboard } from "lucide-react";
import { Series, Episode } from "@/types";
import { useApp, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
import { Screen, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";

// A Short is just a start/end time range into an episode you already
// own — no new audio file, same idea as the admin Shorts tool, but
// scoped to series this account actually published (the dropdown only
// ever lists your own shows, and the server re-checks ownership too).
function parseTime(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const m = t.match(/^(\d+):([0-5]?\d)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export default function NewCreatorShort() {
  const router = useRouter();
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [series, setSeries] = useState<Series[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [seriesId, setSeriesId] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [start, setStart] = useState("0:00");
  const [end, setEnd] = useState("0:30");
  const [caption, setCaption] = useState("");
  const [hook, setHook] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return; // nothing to fetch — the derived `ready` below handles this case
    let cancelled = false;
    fetch(`/api/series?creatorId=${user._id}&limit=100`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d)) setSeries(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [user?._id]);

  // Derived rather than set synchronously in the effect above: with no
  // user there's nothing to fetch, so "ready to render" is immediate.
  const ready = !user || loaded;

  const episodes: Episode[] = series.find(s => s._id === seriesId)?.episodes ?? [];

  const create = async () => {
    const startSec = parseTime(start);
    const endSec = parseTime(end);

    if (!seriesId || !episodeId) { showToast("Pick one of your series and an episode", "error"); return; }
    if (startSec === null || endSec === null) { showToast("Times must look like 0:30 or 45", "error"); return; }
    if (endSec <= startSec) { showToast("End must be after start", "error"); return; }
    if (endSec - startSec > 90) { showToast("Keep Shorts under 90 seconds", "error"); return; }

    setSaving(true);
    try {
      const r = await creatorFetch("/api/shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId, episodeId, startSec, endSec,
          caption: caption.trim(), hook: hook.trim(),
          creatorHandle: user?.handle ? `@${user.handle}` : "@creator",
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't create Short", "error"); return; }
      showToast("Short posted", "success");
      router.push("/shorts");
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;

  if (!user) {
    return (
      <>
        <TopBar title="Cut a Short"/>
        <Screen>
          <EmptyState icon={<Clapperboard size={22}/>} title="Log in to cut a Short"
            cta={{ href: "/login", label: "Log in" }}
            body="Shorts are cut from episodes you've published."/>
        </Screen>
      </>
    );
  }

  if (!series.length) {
    return (
      <>
        <TopBar title="Cut a Short"/>
        <Screen>
          <EmptyState icon={<Clapperboard size={22}/>} title="Publish a series first"
            body="Shorts are cut from your own episodes — publish a series with at least one episode, then come back here."
            cta={{ href: "/creator/new", label: "Publish a series" }}/>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Cut a Short"/>
      <Screen>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
          <ArrowLeft size={14}/>Back
        </button>

        <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Your series">
            <select className="inp" value={seriesId}
              onChange={e => { setSeriesId(e.target.value); setEpisodeId(""); }}>
              <option value="">Select a series…</option>
              {series.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
            </select>
          </Field>
          <Field label="Episode">
            <select className="inp" value={episodeId} disabled={!seriesId}
              onChange={e => setEpisodeId(e.target.value)}>
              <option value="">Select an episode…</option>
              {episodes.map(ep => (
                <option key={ep._id} value={ep._id}>EP {ep.episodeNumber} — {ep.title}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Start (m:ss)">
              <input className="inp" value={start} onChange={e => setStart(e.target.value)} placeholder="0:00"/>
            </Field>
            <Field label="End (m:ss)">
              <input className="inp" value={end} onChange={e => setEnd(e.target.value)} placeholder="0:30"/>
            </Field>
          </div>
          <Field label="Hook">
            <input className="inp" value={hook} onChange={e => setHook(e.target.value)} placeholder="The line that makes someone stop scrolling"/>
          </Field>
          <Field label="Caption">
            <input className="inp" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Optional caption"/>
          </Field>
        </section>

        <button onClick={create} disabled={saving} className="btn btn-primary" style={{ justifyContent: "center" }}>
          {saving ? "Posting…" : "Post Short"}
        </button>
      </Screen>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 5 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
