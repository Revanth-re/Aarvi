"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Mic, Image as ImageIcon, Quote, X, Send, EyeOff, Eye, Trash2, MoreVertical } from "lucide-react";
import { StoryGroup, StoryKind } from "@/types";
import { useApp, useToast } from "@/store";
import { timeAgo } from "@/lib/gamification";
import { creatorFetch } from "@/lib/creatorFetch";
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
    // Don't count yourself as a viewer of your own story.
    if (user && g.stories[0] && g.userId !== user._id) {
      fetch(`/api/stories/${g.stories[0]._id}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      }).catch(() => {});
    }
  }, [user?._id, markStorySeen]);

  const ownGroup = user ? groups.find(g => g.userId === user._id) : undefined;

  return (
    <>
      <div className="rail" style={{ gap: 14, padding: "2px 0" }}>
        {/* Your story — opens the viewer if you already have one live,
            otherwise straight to the composer. Either way, a small "+"
            badge always adds a new one. */}
        <button
          onClick={() => {
            if (!user) { showToast("Log in to post a story", "info"); return; }
            if (ownGroup) open(ownGroup); else setComposerOpen(true);
          }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "none", background: "none", border: "none", cursor: "pointer", padding: 0, width: 64 }}>
          <span style={{ position: "relative", width: 56, height: 56 }}>
            {ownGroup ? (
              <span style={{
                width: 56, height: 56, borderRadius: "50%", padding: 2, display: "block",
                // A hidden ("only me") story gets a dashed ring — a
                // quiet reminder that it's not actually visible to anyone
                // else. The seen/unseen gradient rule doesn't apply to
                // your own story — you always "know" you posted it.
                background: ownGroup.stories[0]?.hidden ? "transparent" : "var(--border2)",
                border: ownGroup.stories[0]?.hidden ? "1.5px dashed var(--text3)" : "none",
              }}>
                <span style={{
                  display: "block", width: "100%", height: "100%", borderRadius: "50%",
                  border: "2px solid var(--bg)", overflow: "hidden",
                }}>
                  <Avatar name={user!.name} image={user!.image} size={48}/>
                </span>
              </span>
            ) : (
              <span style={{
                width: 56, height: 56, borderRadius: "50%",
                border: "1.5px dashed color-mix(in srgb, var(--accent) 55%, transparent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent)", background: "var(--surface)",
              }}>
                <Plus size={20}/>
              </span>
            )}
            {ownGroup && (
              <span
                role="button" aria-label="Add another story"
                onClick={e => { e.stopPropagation(); setComposerOpen(true); }}
                style={{
                  position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%",
                  background: "var(--accent)", color: "#fff", border: "2px solid var(--bg)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Plus size={12}/>
              </span>
            )}
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

      {viewing && (
        <StoryViewer
          group={viewing}
          onClose={() => setViewing(null)}
          onMutated={() => setReloadKey(k => k + 1)}
        />
      )}
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
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Needs creatorFetch, not a bare fetch — /api/upload requires an
      // x-user-id header to know who's uploading (see requireUser).
      const r = await creatorFetch("/api/upload", { method: "POST", body: fd });
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
        body: JSON.stringify({ userId: user._id, kind, caption, mediaUrl, hidden }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't post", "error"); return; }
      showToast(hidden ? "Story posted — only visible to you" : "Story posted — live for 24 hours", "success");
      setCaption(""); setMediaUrl(""); setHidden(false);
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

      <label style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "10px 2px", marginBottom: 12, cursor: "pointer",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text2)" }}>
          <EyeOff size={15}/>Hide from followers (only you can see it)
        </span>
        <span className="toggle">
          <input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)}/>
          <span className="toggle-track"/>
        </span>
      </label>

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
function StoryViewer({
  group, onClose, onMutated,
}: { group: StoryGroup; onClose: () => void; onMutated: () => void }) {
  const user = useApp(s => s.user);
  const setUser = useApp(s => s.setUser);
  const showToast = useToast(s => s.show);
  const [idx, setIdx] = useState(0);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [following, setFollowing] = useState(false);
  // A local, mutable copy so hide/delete update the viewer instantly
  // instead of waiting on a full rail refetch (onMutated still triggers
  // that refetch in the background, to keep the rail itself in sync).
  const [localStories, setLocalStories] = useState(group.stories);
  const [menuOpen, setMenuOpen] = useState(false);
  const story = localStories[idx];
  const isOwn = user?._id === group.userId;
  const isFollowing = user ? (user.following || []).includes(group.userId) : false;
  const isRequested = user ? (user.followRequestsSent || []).includes(group.userId) : false;

  // Instagram rule: replying to a story requires following its owner —
  // viewing doesn't (the home rail is already follow-scoped), but the
  // swipe-up reply itself is gated. See POST /api/messages for the
  // matching server-side check this UI is standing in front of.
  const followToReply = async () => {
    if (!user) { showToast("Log in to follow", "info"); return; }
    setFollowing(true);
    try {
      const r = await fetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: group.userId }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't follow", "error"); return; }
      setUser({ ...user, following: d.following, followRequestsSent: d.followRequestsSent });
      showToast(d.status === "requested" ? "Follow request sent" : "Followed — you can reply now", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setFollowing(false);
    }
  };

  const toggleHidden = async () => {
    if (!user || !story) return;
    const next = !story.hidden;
    setMenuOpen(false);
    try {
      const r = await fetch(`/api/stories/${story._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, hidden: next }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't update", "error"); return; }
      setLocalStories(prev => prev.map((s, i) => i === idx ? { ...s, hidden: next } : s));
      showToast(next ? "Hidden — only you can see it now" : "Visible to followers again", "success");
      onMutated();
    } catch {
      showToast("Network error", "error");
    }
  };

  const deleteStory = async () => {
    if (!user || !story) return;
    if (!window.confirm("Delete this story? This can't be undone.")) return;
    setMenuOpen(false);
    try {
      const r = await fetch(`/api/stories/${story._id}?userId=${user._id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't delete", "error"); return; }
      showToast("Story deleted", "success");
      onMutated();
      const next = localStories.filter((_, i) => i !== idx);
      if (!next.length) { onClose(); return; }
      setLocalStories(next);
      setIdx(i => Math.min(i, next.length - 1));
    } catch {
      showToast("Network error", "error");
    }
  };

  const sendReply = async () => {
    if (!user) { showToast("Log in to reply to stories", "info"); return; }
    const text = reply.trim();
    if (!text || !story) return;

    setSending(true);
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id, toId: group.userId, text,
          storyRef: { storyId: story._id, kind: story.kind, mediaUrl: story.mediaUrl || "", caption: story.caption || "" },
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't send", "error"); return; }
      setReply("");
      showToast("Reply sent", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setSending(false);
    }
  };

  // Escape closes, arrows move — the viewer takes over the screen, so
  // it needs to be dismissible without hunting for the X.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx(i => Math.min(localStories.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [localStories.length, onClose]);

  if (!story) return null;
  const Icon = KIND_ICON[story.kind];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500, background: "#0B0910",
      maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column",
    }} className="anim-in">
      <div style={{ display: "flex", gap: 4, padding: "10px 12px 6px" }}>
        {localStories.map((_, i) => (
          <span key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= idx ? "#fff" : "rgba(255,255,255,.3)",
          }}/>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px 0", position: "relative" }}>
        <Avatar name={group.name} image={group.image} size={32}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
            {group.name}{story.hidden && isOwn && <span style={{ fontWeight: 500, color: "rgba(255,255,255,.6)" }}> · Hidden</span>}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>{timeAgo(story.createdAt)} ago</div>
        </div>

        {isOwn && (
          <button onClick={() => setMenuOpen(v => !v)} aria-label="Story options"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}>
            <MoreVertical size={20}/>
          </button>
        )}
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}>
          <X size={22}/>
        </button>

        {menuOpen && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", top: 40, right: 14, zIndex: 5, minWidth: 190,
              background: "#1B1720", borderRadius: 14, padding: 6,
              boxShadow: "0 8px 24px rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.1)",
            }}>
            <button onClick={toggleHidden} style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px",
              background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 13, borderRadius: 9,
            }}>
              {story.hidden ? <Eye size={15}/> : <EyeOff size={15}/>}
              {story.hidden ? "Unhide from followers" : "Hide from followers"}
            </button>
            <button onClick={deleteStory} style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px",
              background: "none", border: "none", cursor: "pointer", color: "#FF6B7A", fontSize: 13, borderRadius: 9,
            }}>
              <Trash2 size={15}/>Delete story
            </button>
          </div>
        )}
      </div>

      <div
        onClick={() => { if (menuOpen) { setMenuOpen(false); return; } idx < localStories.length - 1 ? setIdx(idx + 1) : onClose(); }}
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

      {/* Reply → becomes a DM to the story's owner, not a public
          comment (same as Instagram). Not shown on your own story.
          Needs to follow them first, same as Instagram — a pending
          request just posted still can't reply until it's accepted. */}
      {!isOwn && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            display: "flex", gap: 8, padding: "10px 14px",
            marginBottom: "env(safe-area-inset-bottom, 10px)",
          }}>
          {isFollowing ? (
            <>
              <input
                value={reply} onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendReply(); }}
                placeholder={`Reply to ${group.name.split(" ")[0]}…`}
                style={{
                  flex: 1, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)",
                  borderRadius: 999, padding: "10px 16px", color: "#fff", fontSize: 13.5, outline: "none",
                }}
              />
              <button onClick={sendReply} disabled={sending || !reply.trim()} aria-label="Send reply"
                style={{
                  width: 40, height: 40, borderRadius: "50%", border: "none", flex: "none",
                  background: "var(--grad)", color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: reply.trim() ? 1 : .5,
                }}>
                <Send size={16}/>
              </button>
            </>
          ) : isRequested ? (
            <div style={{
              flex: 1, textAlign: "center", padding: "10px 16px", borderRadius: 999,
              background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)", fontSize: 12.5,
            }}>
              Follow request sent — you can reply once accepted
            </div>
          ) : (
            <button onClick={followToReply} disabled={following}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "11px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                background: "var(--grad)", color: "#fff", fontSize: 13.5, fontWeight: 700,
              }}>
              {following ? "Following…" : `Follow ${group.name.split(" ")[0]} to reply`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
