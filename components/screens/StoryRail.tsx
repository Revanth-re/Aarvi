"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Mic, Image as ImageIcon, Quote, X } from "lucide-react";
import { StoryGroup, StoryKind } from "@/types";
import { useApp, useToast } from "@/store";
import { timeAgo } from "@/lib/gamification";
import { Sheet } from "@/components/kit";
import Avatar from "@/components/ui/Avatar";

const KIND_ICON: Record<StoryKind, React.ComponentType<{ size?: number }>> = {
  audio: Mic, photo: ImageIcon, quote: Quote,
};
const KIND_LABEL: Record<StoryKind, string> = {
  audio: "audio", photo: "photo", quote: "quote",
};

export default function StoryRail() {
  const user = useApp(s => s.user);
  const seenStories = useApp(s => s.seenStories);
  const markStorySeen = useApp(s => s.markStorySeen);
  const showToast = useToast(s => s.show);

  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewing, setViewing] = useState<StoryGroup | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const qs = user ? `?userId=${user._id}` : "";
    fetch(`/api/stories${qs}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d)) setGroups(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id, reloadKey]);

  const open = useCallback((g: StoryGroup) => {
    setViewing(g);
    markStorySeen(g.userId);
    if (user && g.stories[0]) {
      fetch(`/api/stories/${g.stories[0]._id}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      }).catch(() => {});
    }
  }, [user?._id, markStorySeen]);

  return (
    <>
      <div className="rail" style={{ gap: 14, padding: "2px 0" }}>
        {/* Your story */}
        <button
          onClick={() => user ? setComposerOpen(true) : showToast("Log in to post a story", "info")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "none", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{
            width: 56, height: 56, borderRadius: "50%",
            border: "1.5px dashed color-mix(in srgb, var(--accent) 55%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent)", background: "var(--surface)",
          }}>
            <Plus size={20}/>
          </span>
          <span style={{ fontSize: 10.5, color: "var(--text3)", fontWeight: 600 }}>Your story</span>
        </button>

        {groups.filter(g => g.userId !== user?._id).map(g => {
          const seen = seenStories.includes(g.userId);
          return (
            <button key={g.userId} onClick={() => open(g)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "none", background: "none", border: "none", cursor: "pointer", padding: 0, width: 64 }}>
              <span style={{
                width: 56, height: 56, borderRadius: "50%", padding: 2,
                display: "block",
                // An unseen story gets the gradient ring; a seen one
                // fades to a flat border — the standard signal.
                background: seen ? "var(--border2)" : "var(--grad)",
              }}>
                <span style={{
                  display: "block", width: "100%", height: "100%", borderRadius: "50%",
                  border: "2px solid var(--bg)", overflow: "hidden",
                }}>
                  <Avatar name={g.name} image={g.image} size={48}/>
                </span>
              </span>
              <span className="truncate" style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, maxWidth: 64 }}>
                {g.name.split(" ")[0]} · {KIND_LABEL[g.latestKind]}
              </span>
            </button>
          );
        })}
      </div>

      <PostStorySheet
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPosted={() => { setComposerOpen(false); setReloadKey(k => k + 1); }}
      />

      {viewing && <StoryViewer group={viewing} onClose={() => setViewing(null)}/>}
    </>
  );
}

// ── Post a story ── (matches the modal screenshot)
function PostStorySheet({
  open, onClose, onPosted,
}: { open: boolean; onClose: () => void; onPosted: () => void }) {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const [kind, setKind] = useState<StoryKind>("quote");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "Upload failed");
      setMediaUrl(d.url);
      showToast("Uploaded", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const post = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, kind, caption, mediaUrl }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't post", "error"); return; }
      showToast("Story posted — live for 24 hours", "success");
      setCaption(""); setMediaUrl("");
      onPosted();
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Post a story">
      <textarea
        className="inp"
        rows={3}
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="Voice note caption, a line you loved, a mood…"
        maxLength={280}
        style={{ marginBottom: 14 }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["audio", "photo", "quote"] as StoryKind[]).map(k => {
          const Icon = KIND_ICON[k];
          return (
            <button key={k} className="chip" data-active={kind === k}
              onClick={() => { setKind(k); setMediaUrl(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6, textTransform: "capitalize" }}>
              <Icon size={13}/>{k}
            </button>
          );
        })}
      </div>

      {/* Audio and photo stories need a file; quotes are text only. */}
      {kind !== "quote" && (
        <label style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: 14, borderRadius: "var(--r)", cursor: "pointer", marginBottom: 16,
          border: "1.5px dashed var(--border2)", color: "var(--text2)", fontSize: 13,
        }}>
          <input
            type="file"
            accept={kind === "audio" ? "audio/*" : "image/*"}
            hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}
          />
          {uploading ? "Uploading…" : mediaUrl ? "✓ File attached — tap to replace" : `Choose ${kind === "audio" ? "an audio clip" : "a photo"}`}
        </label>
      )}

      <button onClick={post} disabled={busy || uploading} className="btn btn-primary" style={{ width: "100%" }}>
        {busy ? "Posting…" : "Post story"}
      </button>
      <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 10 }}>
        Stories disappear after 24 hours.
      </p>
    </Sheet>
  );
}

// ── Full-screen story viewer ──
function StoryViewer({ group, onClose }: { group: StoryGroup; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const story = group.stories[idx];

  // Escape closes, arrows move — the viewer takes over the screen, so
  // it needs to be dismissible without hunting for the X.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx(i => Math.min(group.stories.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [group.stories.length, onClose]);

  if (!story) return null;
  const Icon = KIND_ICON[story.kind];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500, background: "#0B0910",
      maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column",
    }} className="anim-in">
      <div style={{ display: "flex", gap: 4, padding: "10px 12px 6px" }}>
        {group.stories.map((_, i) => (
          <span key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= idx ? "#fff" : "rgba(255,255,255,.3)",
          }}/>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px 0" }}>
        <Avatar name={group.name} image={group.image} size={32}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{group.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>{timeAgo(story.createdAt)} ago</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}>
          <X size={22}/>
        </button>
      </div>

      <div
        onClick={() => idx < group.stories.length - 1 ? setIdx(idx + 1) : onClose()}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 28, cursor: "pointer" }}>
        {story.kind === "photo" && story.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.mediaUrl} alt="" style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 18, objectFit: "contain" }}/>
        ) : (
          <div style={{
            width: 92, height: 92, borderRadius: "50%", background: "var(--grad)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
          }}>
            <Icon size={34}/>
          </div>
        )}

        {story.kind === "audio" && story.mediaUrl && (
          <audio src={story.mediaUrl} controls autoPlay style={{ width: "100%", maxWidth: 320 }}
            onClick={e => e.stopPropagation()}/>
        )}

        {story.caption && (
          <p style={{
            fontSize: story.kind === "quote" ? 21 : 15,
            fontWeight: story.kind === "quote" ? 700 : 500,
            color: "#fff", textAlign: "center", lineHeight: 1.5, margin: 0,
          }}>
            {story.caption}
          </p>
        )}
      </div>
    </div>
  );
}
