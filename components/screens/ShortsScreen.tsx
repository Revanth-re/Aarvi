"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Bookmark, Play, Pause, Zap, X, Trash2, Pencil, Check } from "lucide-react";
import { ShortFeedItem, ShortComment, Conversation } from "@/types";
import { useApp, useToast, usePlayer, useDataCache, cacheKeyFor } from "@/store";
import { formatCount, formatTime, timeAgo } from "@/lib/gamification";
import { Waveform, EmptyState, Screen, Sheet } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";

/* eslint-disable @next/next/no-img-element */

// Vertical, scroll-snapped reel feed.
//
// Playback uses ONE shared <audio> element for the whole feed, not one
// per card: mobile browsers cap concurrent media elements, so ~20 of
// them would silently stop playing partway down. IntersectionObserver
// retargets that single element as cards come into view.
const HEARTBEAT_SECONDS = 15;

export default function ShortsScreen() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const setPlaying = usePlayer(s => s.setPlaying);

  const cacheKey = cacheKeyFor("shorts", user?._id);
  const cached = useDataCache(s => s.cache[cacheKey]) as ShortFeedItem[] | undefined;
  const setCache = useDataCache(s => s.setCache);

  const [items, setItems] = useState<ShortFeedItem[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [active, setActive] = useState(0);
  const [playing, setLocal] = useState(true);

  // ── Comments ──
  const [commentsFor, setCommentsFor] = useState<ShortFeedItem | null>(null);
  const [comments, setComments] = useState<ShortComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // ── Share to a friend (in-app DM) ──
  const [shareFor, setShareFor] = useState<ShortFeedItem | null>(null);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const audio = useRef<HTMLAudioElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const pending = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shorts${user ? `?userId=${user._id}` : ""}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d)) { setItems(d); setCache(cacheKey, d); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?._id]);

  // Entering Shorts stops the main player — two audio sources talking
  // over each other is never what anyone wants.
  useEffect(() => { setPlaying(false); }, [setPlaying]);

  useEffect(() => {
    if (!items.length) return;
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.intersectionRatio >= 0.6) {
          const i = Number((e.target as HTMLElement).dataset.idx);
          if (!Number.isNaN(i)) setActive(i);
        }
      }
    // 0.6 not 1.0: scroll-snap settles a pixel or two off, and a
    // threshold of 1 would leave nothing active at rest.
    }, { threshold: [0.6], root: container.current });

    cards.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  useEffect(() => {
    const a = audio.current;
    const item = items[active];
    if (!a || !item || !item.audioUrl) return;

    // Only reload when the underlying episode changes — several shorts
    // can be different ranges of the same episode.
    const url = new URL(item.audioUrl, window.location.href).href;
    if (a.src !== url) { a.src = item.audioUrl; a.load(); }
    a.currentTime = item.startSec;

    // Autoplay may be blocked until the user interacts; reflect that in
    // the UI instead of showing a stuck "playing" state.
    if (playing) a.play().catch(() => setLocal(false));
  }, [active, items, playing]);

  const onTime = useCallback(() => {
    const a = audio.current;
    const item = items[active];
    if (!a || !item) return;

    if (a.currentTime >= item.endSec) a.currentTime = item.startSec;   // loop the clip

    pending.current += 0.25;
    if (pending.current >= HEARTBEAT_SECONDS && user) {
      const secs = Math.round(pending.current);
      pending.current = 0;
      fetch(`/api/users/${user._id}/gamification`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: secs }),
      }).catch(() => {});
    }
  }, [active, items, user?._id]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) { a.pause(); setLocal(false); } else { a.play().catch(() => {}); setLocal(true); }
  };

  const act = async (item: ShortFeedItem, idx: number, kind: "like" | "save") => {
    if (!user) { showToast(`Log in to ${kind} shorts`, "info"); return; }
    const before = { ...item };

    setItems(prev => prev.map((s, i) => i !== idx ? s : kind === "like"
      ? { ...s, liked: !s.liked, likeCount: s.likeCount + (s.liked ? -1 : 1) }
      : { ...s, saved: !s.saved }));

    try {
      const r = await fetch(`/api/shorts/${item._id}/${kind}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      if (kind === "save") showToast(d.saved ? "Saved to Library" : "Removed from Library", "success");
      else setItems(prev => prev.map((s, i) => i === idx ? { ...s, liked: d.liked, likeCount: d.likeCount } : s));
    } catch {
      setItems(prev => prev.map((s, i) => i === idx ? before : s));
      showToast("Couldn't save that", "error");
    }
  };

  const shareExternal = async (item: ShortFeedItem) => {
    const url = `${window.location.origin}/series/${item.seriesId}`;
    try {
      if (navigator.share) await navigator.share({ title: item.caption || item.seriesTitle, url });
      else { await navigator.clipboard.writeText(url); showToast("Link copied", "success"); }
    } catch { /* dismissed */ }
  };

  // Instagram-style "send to a friend" — picks from your existing DM
  // threads rather than only the OS share sheet. Reuses the same
  // messages endpoint the Messages tab itself posts to.
  const openShareToFriend = (item: ShortFeedItem) => {
    if (!user) { showToast("Log in to share", "info"); return; }
    setShareFor(item);
    fetch(`/api/messages?userId=${user._id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.conversations)) setConvos(d.conversations); })
      .catch(() => {});
  };
  const sendToFriend = async (toId: string) => {
    if (!user || !shareFor) return;
    setSendingTo(toId);
    try {
      const url = `${window.location.origin}/series/${shareFor.seriesId}`;
      const r = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id, toId,
          text: `Check out this clip 🎧 "${shareFor.caption || shareFor.episodeTitle}" — ${url}`,
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't send", "error"); return; }
      showToast("Sent!", "success");
      setShareFor(null);
    } catch {
      showToast("Network error", "error");
    } finally {
      setSendingTo(null);
    }
  };

  const openComments = (item: ShortFeedItem) => {
    setCommentsFor(item);
    setCommentsLoaded(false);
    fetch(`/api/shorts/${item._id}/comments${user ? `?userId=${user._id}` : ""}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setComments(d); })
      .catch(() => {})
      .finally(() => setCommentsLoaded(true));
  };
  const postComment = async () => {
    if (!user || !commentsFor) { showToast("Log in to comment", "info"); return; }
    const text = commentDraft.trim();
    if (!text) return;
    setPosting(true);
    try {
      const r = await fetch(`/api/shorts/${commentsFor._id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, text }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't post", "error"); return; }
      setComments(prev => [...prev, d]);
      setCommentDraft("");
      setItems(prev => prev.map(s => s._id === commentsFor._id ? { ...s, commentCount: s.commentCount + 1 } : s));
    } catch {
      showToast("Network error", "error");
    } finally {
      setPosting(false);
    }
  };
  const saveEdit = async (commentId: string) => {
    if (!user || !commentsFor) return;
    const text = editDraft.trim();
    if (!text) return;
    try {
      const r = await fetch(`/api/shorts/${commentsFor._id}/comments/${commentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, text }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't save", "error"); return; }
      setComments(prev => prev.map(c => c._id === commentId ? { ...c, text: d.text, editedAt: d.editedAt } : c));
      setEditingId(null);
    } catch {
      showToast("Network error", "error");
    }
  };
  const deleteComment = async (commentId: string) => {
    if (!user || !commentsFor) return;
    try {
      const r = await fetch(`/api/shorts/${commentsFor._id}/comments/${commentId}?userId=${user._id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't delete", "error"); return; }
      setComments(prev => prev.filter(c => c._id !== commentId));
      setItems(prev => prev.map(s => s._id === commentsFor._id ? { ...s, commentCount: Math.max(0, s.commentCount - 1) } : s));
    } catch {
      showToast("Network error", "error");
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Shorts"/>
        <Screen><div className="skeleton" style={{ height: "62vh", borderRadius: 20 }}/></Screen>
      </>
    );
  }

  if (!items.length) {
    return (
      <>
        <TopBar title="Shorts"/>
        <Screen>
          <EmptyState
            icon={<Zap size={22}/>}
            title="No shorts yet"
            body="A short is a clip cut from an episode you already have — pick a series, an episode and a start/end time in the admin panel. No new upload needed."
            cta={{ href: "/admin/shorts", label: "Open admin" }}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Shorts"/>
      <audio ref={audio} onTimeUpdate={onTime} preload="auto" playsInline/>

      <div ref={container} className="no-scroll" style={{
        height: "calc(100vh - var(--topbar-h) - var(--nav-h))",
        overflowY: "auto", scrollSnapType: "y mandatory",
      }}>
        {items.map((item, idx) => (
          <div key={item._id} data-idx={idx}
            ref={el => { cards.current[idx] = el; }}
            onClick={toggle}
            style={{
              scrollSnapAlign: "start", scrollSnapStop: "always",
              height: "calc(100vh - var(--topbar-h) - var(--nav-h))",
              position: "relative", display: "flex", alignItems: "flex-end",
              background: item.gradient, overflow: "hidden", cursor: "pointer",
              padding: 16,
            }}>
            {item.coverImage && (
              <img src={item.coverImage} alt="" style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", opacity: .5,
              }}/>
            )}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg,rgba(0,0,0,.28) 0%,transparent 32%,transparent 52%,rgba(0,0,0,.78) 100%)",
            }}/>

            <span style={{
              position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,.42)",
              backdropFilter: "blur(6px)", color: "#fff", fontSize: 11, fontWeight: 700,
              padding: "4px 10px", borderRadius: "var(--r-pill)",
            }}>
              {formatTime(item.endSec - item.startSec)}
            </span>

            {/* Waveform + play affordance */}
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, transform: "translateY(-50%)", padding: "0 76px 0 20px" }}>
              <Waveform seed={item._id} playing={playing && idx === active}/>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                <span style={{
                  width: 58, height: 58, borderRadius: "50%", background: "rgba(0,0,0,.4)",
                  backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {playing && idx === active
                    ? <Pause size={24} color="#fff" fill="#fff"/>
                    : <Play size={24} color="#fff" fill="#fff"/>}
                </span>
              </div>
            </div>

            {/* Right rail */}
            <div style={{
              position: "absolute", right: 12, bottom: 96, zIndex: 3,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 18, color: "#fff",
            }}>
              <RailBtn onClick={e => { e.stopPropagation(); act(item, idx, "like"); }}
                icon={<Heart size={26} fill={item.liked ? "#FF4D6D" : "none"} color={item.liked ? "#FF4D6D" : "#fff"}/>}
                label={formatCount(item.likeCount)}/>
              <RailBtn onClick={e => { e.stopPropagation(); openComments(item); }}
                icon={<MessageCircle size={25}/>} label={formatCount(item.commentCount)}/>
              <RailBtn onClick={e => { e.stopPropagation(); openShareToFriend(item); }}
                icon={<Send size={24}/>} label="share"/>
              <RailBtn onClick={e => { e.stopPropagation(); act(item, idx, "save"); }}
                icon={<Bookmark size={24} fill={item.saved ? "#fff" : "none"}/>}/>
            </div>

            {/* Caption */}
            <div style={{ position: "relative", zIndex: 3, color: "#fff", paddingRight: 70, width: "100%" }}>
              <Link href={`/series/${item.seriesId}`} onClick={e => e.stopPropagation()}
                style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.92)", textDecoration: "none" }}>
                {item.creatorHandle}
              </Link>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6, lineHeight: 1.25 }}>
                {item.caption || item.episodeTitle}
              </div>
              {item.hook && (
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)", marginTop: 3 }}>{item.hook}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Comments ── */}
      <Sheet open={!!commentsFor} onClose={() => setCommentsFor(null)} title="Comments">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh" }}>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, minHeight: 80 }}>
            {!commentsLoaded ? (
              <div className="skeleton" style={{ height: 60, borderRadius: 14 }}/>
            ) : comments.length ? comments.map(c => (
              <div key={c._id} style={{ display: "flex", gap: 9 }}>
                <Avatar name={c.userName} image={c.userImage} size={30}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="truncate" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{c.userHandle}</span>
                    <span style={{ fontSize: 10.5, color: "var(--text3)" }}>
                      {timeAgo(c.createdAt)}{c.editedAt && " · edited"}
                    </span>
                  </div>
                  {editingId === c._id ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <input className="inp" value={editDraft} onChange={e => setEditDraft(e.target.value)}
                        style={{ padding: "7px 10px", fontSize: 12.5 }} autoFocus/>
                      <button onClick={() => saveEdit(c._id)} className="btn btn-soft btn-xs" aria-label="Save"><Check size={13}/></button>
                      <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-xs" aria-label="Cancel"><X size={13}/></button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text2)", margin: "2px 0 0", lineHeight: 1.5 }}>{c.text}</p>
                  )}
                  {c.mine && editingId !== c._id && (
                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      <button onClick={() => { setEditingId(c._id); setEditDraft(c.text); }}
                        style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, padding: 0 }}>
                        <Pencil size={11}/>Edit
                      </button>
                      <button onClick={() => deleteComment(c._id)}
                        style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 11, padding: 0 }}>
                        <Trash2 size={11}/>Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <p style={{ fontSize: 12.5, color: "var(--text3)", textAlign: "center", margin: "20px 0" }}>
                No comments yet — say something!
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <input className="inp" value={commentDraft} onChange={e => setCommentDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") postComment(); }}
              placeholder="Add a comment…" style={{ flex: 1 }}/>
            <button onClick={postComment} disabled={posting || !commentDraft.trim()} className="btn btn-primary btn-sm">
              {posting ? "…" : "Post"}
            </button>
          </div>
        </div>
      </Sheet>

      {/* ── Share to a friend ── */}
      <Sheet open={!!shareFor} onClose={() => setShareFor(null)} title="Share">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button onClick={() => shareFor && shareExternal(shareFor)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 4px",
            background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%",
          }}>
            <span style={{
              width: 40, height: 40, borderRadius: "50%", background: "var(--grad)",
              display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
            }}>
              <Send size={16} color="#fff"/>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Share via…</span>
          </button>

          {convos.length ? convos.map(c => {
            const other = c.participants[0];
            if (!other) return null;
            return (
              <button key={c._id} onClick={() => sendToFriend(other._id)} disabled={sendingTo === other._id}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 4px",
                  background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                }}>
                <Avatar name={other.name} image={other.image} size={40}/>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--text)" }} className="truncate">
                  {other.name}
                </span>
                {sendingTo === other._id && <span style={{ fontSize: 11, color: "var(--text3)" }}>Sending…</span>}
              </button>
            );
          }) : (
            <p style={{ fontSize: 12, color: "var(--text3)", padding: "8px 4px" }}>
              Message someone first to share directly with them here.
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}

function RailBtn({
  icon, label, onClick,
}: { icon: React.ReactNode; label?: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 0,
      fontFamily: "inherit",
    }}>
      {icon}
      {label && <span style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</span>}
    </button>
  );
}
