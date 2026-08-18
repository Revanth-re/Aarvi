"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ChevronDown, ChevronUp, ArrowLeft, Upload, Mic2,
  Sparkles, Play, Check, FileAudio,
} from "lucide-react";
import { Series, Episode, Credit, LANGUAGES, NARRATION_VOICES } from "@/types";
import { useApp, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
import { Screen } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import FileUpload from "@/components/admin/FileUpload";
import CreditsEditor from "./CreditsEditor";

const GENRES = [
  "Thriller", "Mythology", "Romance", "Horror", "Comedy",
  "Coming of Age", "Mystery", "Drama", "Fantasy", "True Crime",
  "Devotional", "Friendship",
];

const MAX_NARRATION_CHARS = 6000;

type NarrationMode = "upload" | "voice";
type EpDraft = Partial<Episode>;

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
//
// Two publishing knobs live here, both from the SWARA FM requirements
// doc: (1) drafts — a whole series, or individual episodes within an
// otherwise-published series, can be saved without going public, and
// published later one at a time; (2) voice narration — an episode's
// audio can come from typed text read by a chosen voice instead of an
// uploaded file, via /api/creator/tts.
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
    isDraft: initial?.isDraft || false,
  });
  const [episodes, setEps] = useState<EpDraft[]>(
    initial?.episodes?.map(e => ({ ...e })) || []
  );
  const [credits, setCredits] = useState<Credit[]>(initial?.credits || []);
  const [expandedEp, setExpandedEp] = useState<number | null>(null);
  // Per-episode UI-only state — not persisted, just drives which panel
  // shows. Defaults to "voice" if the episode already has a narration
  // voice saved on it (i.e. it was generated, not uploaded).
  const [mode, setMode] = useState<Record<number, NarrationMode>>({});
  const [generating, setGenerating] = useState<Record<number, boolean>>({});
  const [publishing, setPublishing] = useState<Record<number, boolean>>({});

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const modeFor = (i: number): NarrationMode =>
    mode[i] || (episodes[i]?.narrationVoice ? "voice" : "upload");

  const addEp = () => {
    setEps(eps => [...eps, {
      title: "", description: "", duration: 0, audioUrl: "",
      episodeNumber: eps.length + 1, isLocked: false, transcript: "", playCount: 0,
      isDraft: false, narrationVoice: "", narrationText: "",
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

  const chooseVoiceMode = (i: number) => {
    setMode(m => ({ ...m, [i]: "voice" }));
    if (!episodes[i]?.narrationVoice) setEp(i, "narrationVoice", NARRATION_VOICES[0].key);
  };
  const chooseUploadMode = (i: number) => {
    setMode(m => ({ ...m, [i]: "upload" }));
  };

  const generateNarration = async (i: number) => {
    if (!user) { showToast("Log in first", "error"); return; }
    const ep = episodes[i];
    const text = (ep.narrationText || "").trim();
    if (!text) { showToast("Write the episode text first", "error"); return; }
    if (text.length > MAX_NARRATION_CHARS) {
      showToast(`Keep it under ${MAX_NARRATION_CHARS.toLocaleString()} characters`, "error");
      return;
    }
    setGenerating(g => ({ ...g, [i]: true }));
    try {
      const r = await creatorFetch("/api/creator/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: ep.narrationVoice || NARRATION_VOICES[0].key }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Narration failed", "error"); return; }
      setEps(eps => eps.map((e, j) => (j === i ? { ...e, audioUrl: d.url, duration: d.duration } : e)));
      showToast("Narration ready", "success");
    } catch {
      showToast("Network error — couldn't generate narration", "error");
    } finally {
      setGenerating(g => ({ ...g, [i]: false }));
    }
  };

  // One-tap publish for an already-saved draft episode — a lighter
  // call than resaving the whole series (see the dedicated route for
  // why: it skips re-running transcript generation for every episode).
  const publishEpisodeNow = async (i: number) => {
    const ep = episodes[i];
    if (!isEdit || !ep._id) return;
    if (!ep.audioUrl) { showToast("Add audio before publishing this episode", "error"); return; }
    setPublishing(p => ({ ...p, [i]: true }));
    try {
      const r = await creatorFetch(`/api/series/${initial!._id}/episodes/${ep._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDraft: false }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't publish", "error"); return; }
      setEp(i, "isDraft", false);
      showToast("Episode published", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setPublishing(p => ({ ...p, [i]: false }));
    }
  };

  const submit = async () => {
    if (!user) { showToast("Log in first", "error"); return; }
    if (!form.title.trim()) { setErr("Title is required."); return; }
    if (!form.description.trim()) { setErr("Description is required."); return; }

    // A draft series is just being assembled — episodes can be empty,
    // untitled work-in-progress. Publishing for real still needs at
    // least one episode, and every non-draft episode needs both a
    // title and finished audio (uploaded or narrated).
    if (!form.isDraft) {
      if (!episodes.length) { setErr("Add at least one episode."); return; }
      if (episodes.some(e => !e.title?.trim())) {
        setErr("Every episode needs a title.");
        return;
      }
      if (episodes.some(e => !e.isDraft && !e.audioUrl)) {
        setErr("Every published episode needs audio — upload a file or generate a voice narration, or mark it as a draft.");
        return;
      }
    } else if (episodes.some(e => !e.title?.trim())) {
      setErr("Every episode needs at least a title.");
      return;
    }

    setSaving(true); setErr("");
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        episodes,
        credits,
      };
      const url = isEdit ? `/api/series/${initial!._id}` : "/api/series";
      const method = isEdit ? "PUT" : "POST";
      const r = await creatorFetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok || d.error) { setErr(d.error || "Something went wrong."); setSaving(false); return; }

      showToast(
        form.isDraft ? "Draft saved" : isEdit ? "Series updated" : "Series published",
        "success"
      );
      router.push(form.isDraft ? "/creator" : `/series/${d._id}`);
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
          <Field label="Credits — writer, narrator, voice artists…">
            <CreditsEditor credits={credits} onChange={setCredits}/>
          </Field>

          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
            borderRadius: 12, background: "var(--surface2)", cursor: "pointer",
          }}>
            <input type="checkbox" checked={form.isDraft} onChange={e => set("isDraft", e.target.checked)}
              style={{ marginTop: 2, accentColor: "var(--accent)", width: 16, height: 16, flex: "none" }}/>
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                Save this whole series as a draft
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: "var(--text3)", marginTop: 2 }}>
                Only visible to you in Creator Studio. Nothing goes public until you publish it.
              </span>
            </span>
          </label>
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
                  {ep.isDraft && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase",
                      padding: "3px 7px", borderRadius: "var(--r-pill)", flex: "none",
                      background: "color-mix(in srgb, var(--warning) 16%, transparent)", color: "var(--warning)",
                    }}>
                      Draft
                    </span>
                  )}
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

                    {/* Upload vs. voice-narration — the two publishing methods
                        from the requirements doc, side by side. */}
                    <div>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>
                        Audio *
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <ModeTab active={modeFor(i) === "upload"} onClick={() => chooseUploadMode(i)}
                          icon={<Upload size={13}/>} label="Upload audio"/>
                        <ModeTab active={modeFor(i) === "voice"} onClick={() => chooseVoiceMode(i)}
                          icon={<Mic2 size={13}/>} label="Voice narration"/>
                      </div>

                      {modeFor(i) === "upload" ? (
                        <FileUpload label="" type="audio" currentUrl={ep.audioUrl}
                          onUpload={url => {
                            setEps(eps => eps.map((e, j) => j === i
                              ? { ...e, audioUrl: url, narrationVoice: "", narrationText: "" }
                              : e));
                            if (url) readDuration(i, url);
                          }}
                          fetcher={creatorFetch}/>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div>
                            <textarea className="inp" rows={5}
                              value={ep.narrationText || ""}
                              onChange={e => setEp(i, "narrationText", e.target.value)}
                              placeholder="Paste or write the episode text — the selected voice will read it aloud."/>
                            <div style={{
                              display: "flex", justifyContent: "flex-end", fontSize: 10.5, color: "var(--text3)", marginTop: 3,
                            }}>
                              {(ep.narrationText || "").length.toLocaleString()} / {MAX_NARRATION_CHARS.toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <span style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>
                              Choose a voice
                            </span>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              {NARRATION_VOICES.map(v => {
                                const on = (ep.narrationVoice || NARRATION_VOICES[0].key) === v.key;
                                return (
                                  <button key={v.key} onClick={() => setEp(i, "narrationVoice", v.key)}
                                    style={{
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                      padding: "8px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                                      background: on ? "var(--surface2)" : "var(--surface)",
                                      border: `1.5px solid ${on ? "var(--accent)" : "var(--border2)"}`,
                                    }}>
                                    <span>
                                      <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{v.label}</span>
                                      <span style={{ display: "block", fontSize: 10, color: "var(--text3)" }}>{v.desc}</span>
                                    </span>
                                    {on && <Check size={13} color="var(--accent)" strokeWidth={3}/>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button onClick={() => generateNarration(i)} disabled={generating[i]}
                            className="btn btn-primary btn-sm" style={{ justifyContent: "center" }}>
                            <Sparkles size={13}/>{generating[i] ? "Generating narration…" : "Generate narration"}
                          </button>

                          {ep.audioUrl && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                              borderRadius: 10, background: "var(--surface2)",
                            }}>
                              <FileAudio size={16} color="var(--accent)"/>
                              <audio controls src={ep.audioUrl} style={{ flex: 1, height: 32 }}/>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!!ep.duration && (
                      <div style={{ fontSize: 11.5, color: "var(--text3)" }}>
                        Duration: {Math.floor((ep.duration || 0) / 60)}:{String((ep.duration || 0) % 60).padStart(2, "0")}
                      </div>
                    )}

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={!!ep.isDraft}
                        onChange={e => setEp(i, "isDraft", e.target.checked)}
                        style={{ accentColor: "var(--accent)", width: 15, height: 15 }}/>
                      <span style={{ fontSize: 12.5, color: "var(--text2)" }}>
                        Keep this episode as a draft
                      </span>
                    </label>

                    {isEdit && ep._id && ep.isDraft && (
                      <button onClick={() => publishEpisodeNow(i)} disabled={publishing[i]}
                        className="btn btn-soft btn-sm" style={{ justifyContent: "center" }}>
                        <Play size={13}/>{publishing[i] ? "Publishing…" : "Publish this episode now"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <button onClick={submit} disabled={saving} className="btn btn-primary" style={{ justifyContent: "center" }}>
          {saving
            ? (form.isDraft ? "Saving draft…" : "Publishing…")
            : form.isDraft ? "Save as draft" : isEdit ? "Save changes" : "Publish series"}
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

function ModeTab({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick} type="button" style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: "9px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
      fontSize: 12, fontWeight: 600,
      background: active ? "var(--grad)" : "var(--surface2)",
      color: active ? "#fff" : "var(--text2)",
      border: `1px solid ${active ? "transparent" : "var(--border2)"}`,
    }}>
      {icon}{label}
    </button>
  );
}
