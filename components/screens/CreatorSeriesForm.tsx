"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Series, Episode, LANGUAGES } from "@/types";
import { useApp, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
import { Screen } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import FileUpload from "@/components/admin/FileUpload";

const GENRES = [
  "Thriller", "Mythology", "Romance", "Horror", "Comedy",
  "Coming of Age", "Mystery", "Drama", "Fantasy", "True Crime",
];

interface Props {
  /** Pass an existing series to edit it (must be owned by the current user). */
  initial?: Series;
}

// Lets any logged-in user publish their own series and add episodes to
// it — the same form the admin panel uses under the hood, just scoped
// to what the current account owns. The server (see app/api/series and
// app/api/series/[id]) enforces ownership and strips isFeatured /
// isTrending for non-admins, so there's nothing here that lets a
// regular creator self-promote onto the curated rails.
export default function CreatorSeriesForm({ initial }: Props) {
  const router = useRouter();
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const isEdit = !!initial?._id;

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    coverImage: initial?.coverImage || "",
    genre: initial?.genre || GENRES[0],
    language: initial?.language || "English",
    narrator: initial?.narrator || "",
    tags: initial?.tags?.join(", ") || "",
  });
  const [episodes, setEps] = useState<Partial<Episode>[]>(
    initial?.episodes?.map(e => ({ ...e })) || []
  );
  const [expandedEp, setExpandedEp] = useState<number | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const addEp = () => {
    setEps(eps => [...eps, {
      title: "", description: "", duration: 0, audioUrl: "",
      episodeNumber: eps.length + 1, isLocked: false, transcript: "", playCount: 0,
    }]);
    setExpandedEp(episodes.length);
  };
  const delEp = (i: number) =>
    setEps(eps => eps.filter((_, j) => j !== i).map((e, j) => ({ ...e, episodeNumber: j + 1 })));
  const setEp = (i: number, k: string, v: unknown) =>
    setEps(eps => eps.map((e, j) => (j === i ? { ...e, [k]: v } : e)));

  // Reading duration client-side off the uploaded file, so creators
  // don't have to know or guess the seconds themselves.
  const readDuration = (i: number, url: string) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) setEp(i, "duration", Math.round(audio.duration));
    };
  };

  const submit = async () => {
    if (!user) { showToast("Log in first", "error"); return; }
    if (!form.title.trim()) { setErr("Title is required."); return; }
    if (!form.description.trim()) { setErr("Description is required."); return; }
    if (!episodes.length) { setErr("Add at least one episode."); return; }
    if (episodes.some(e => !e.title?.trim() || !e.audioUrl)) {
      setErr("Every episode needs a title and an uploaded audio file.");
      return;
    }

    setSaving(true); setErr("");
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        episodes,
      };
      const url = isEdit ? `/api/series/${initial!._id}` : "/api/series";
      const method = isEdit ? "PUT" : "POST";
      const r = await creatorFetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok || d.error) { setErr(d.error || "Something went wrong."); setSaving(false); return; }

      showToast(isEdit ? "Series updated" : "Series published", "success");
      router.push(`/series/${d._id}`);
    } catch (e) { setErr(String(e)); setSaving(false); }
  };

  return (
    <>
      <TopBar title={isEdit ? "Edit your series" : "Publish a series"}/>
      <Screen>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
          <ArrowLeft size={14}/>Back
        </button>

        {err && (
          <div style={{
            padding: "12px 14px", borderRadius: 12, fontSize: 13,
            background: "color-mix(in srgb, var(--danger) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
            color: "var(--danger)",
          }}>
            {err}
          </div>
        )}

        <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Title *">
            <input className="inp" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Your series title"/>
          </Field>
          <Field label="Description *">
            <textarea className="inp" rows={3} value={form.description}
              onChange={e => set("description", e.target.value)} placeholder="What's it about?"/>
          </Field>
          <FileUpload label="Cover image" type="image" currentUrl={form.coverImage}
            onUpload={url => set("coverImage", url)} fetcher={creatorFetch}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Genre">
              <select className="inp" value={form.genre} onChange={e => set("genre", e.target.value)}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select className="inp" value={form.language} onChange={e => set("language", e.target.value)}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Narrator / your name">
            <input className="inp" value={form.narrator} onChange={e => set("narrator", e.target.value)} placeholder="Who's narrating"/>
          </Field>
          <Field label="Tags (comma separated)">
            <input className="inp" value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="drama, heartbreak"/>
          </Field>
        </section>

        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>
              Episodes · {episodes.length}
            </div>
            <button onClick={addEp} className="btn btn-soft btn-xs"><Plus size={13}/>Add episode</button>
          </div>

          {!episodes.length && (
            <div style={{
              textAlign: "center", padding: "24px 0", fontSize: 12.5, color: "var(--text3)",
            }}>
              No episodes yet — add your first one.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {episodes.map((ep, i) => (
              <div key={i} className="card" style={{ overflow: "hidden" }}>
                <div
                  onClick={() => setExpandedEp(expandedEp === i ? null : i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                    cursor: "pointer", background: "var(--surface2)",
                  }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 7, background: "var(--accent)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, flex: "none",
                  }}>
                    {i + 1}
                  </span>
                  <span className="truncate" style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {ep.title || `Episode ${i + 1}`}
                  </span>
                  <button onClick={e => { e.stopPropagation(); delEp(i); }} style={{
                    background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4,
                  }}>
                    <Trash2 size={14}/>
                  </button>
                  {expandedEp === i ? <ChevronUp size={16} color="var(--text3)"/> : <ChevronDown size={16} color="var(--text3)"/>}
                </div>

                {expandedEp === i && (
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field label="Episode title *">
                      <input className="inp" value={ep.title || ""} onChange={e => setEp(i, "title", e.target.value)} placeholder="Episode title"/>
                    </Field>
                    <Field label="Description">
                      <input className="inp" value={ep.description || ""} onChange={e => setEp(i, "description", e.target.value)} placeholder="Short description"/>
                    </Field>
                    <FileUpload label="Audio file *" type="audio" currentUrl={ep.audioUrl}
                      onUpload={url => { setEp(i, "audioUrl", url); if (url) readDuration(i, url); }}
                      fetcher={creatorFetch}/>
                    {!!ep.duration && (
                      <div style={{ fontSize: 11.5, color: "var(--text3)" }}>
                        Duration: {Math.floor((ep.duration || 0) / 60)}:{String((ep.duration || 0) % 60).padStart(2, "0")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <button onClick={submit} disabled={saving} className="btn btn-primary" style={{ justifyContent: "center" }}>
          {saving ? "Publishing…" : isEdit ? "Save changes" : "Publish series"}
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
