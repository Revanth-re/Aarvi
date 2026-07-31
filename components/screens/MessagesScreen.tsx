"use client";
import { Fragment, Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Send, MessageSquare, Smile, Paperclip, X, Loader2, Check, CheckCheck, Reply, Download, Trash2 } from "lucide-react";
import { Conversation, MessageItem, MessageAttachment } from "@/types";
import { useApp, useToast, useDataCache, cacheKeyFor } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
import { timeAgo, clockTime, dayLabel } from "@/lib/gamification";
import { Screen, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";

/* eslint-disable @next/next/no-img-element */

// A small fixed palette rather than a full emoji library/GIF-search
// API — no new dependency or API key needed, and it covers the common
// reactions people actually reach for in a DM.
const EMOJIS = [
  "😀","😂","🥰","😍","😅","😊","😉","😎","🤔","😴",
  "😢","😭","😡","🥳","👍","👎","👏","🙏","💪","🔥",
  "❤️","💔","✨","🎉","🎵","🎧","😘","🤗","😱","👀",
];

// useSearchParams (used to support /messages?with=<userId>, opening a
// thread directly from someone's profile) requires a Suspense boundary
// around it in the App Router.
export default function MessagesScreen() {
  return (
    <Suspense fallback={null}>
      <MessagesScreenInner/>
    </Suspense>
  );
}

function MessagesScreenInner() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const searchParams = useSearchParams();
  const withId = searchParams.get("with");

  // Seeded from the shared cache so re-opening Messages shows existing
  // threads immediately instead of "No conversations yet" for a beat
  // while the fresh fetch is in flight — same flicker pattern fixed
  // elsewhere (TopBar's coin count, the Home stories rail).
  const convosKey = cacheKeyFor("conversations", user?._id);
  const cachedConvos = useDataCache(s => s.cache[convosKey]) as Conversation[] | undefined;
  const setCache = useDataCache(s => s.setCache);
  const [fetchedConvos, setFetchedConvos] = useState<Conversation[] | null>(null);
  const convos = fetchedConvos ?? cachedConvos ?? [];
  const [openWith, setOpenWith] = useState<Conversation["participants"][0] | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Bumped after sending, to re-run the thread fetch.
  const [threadKey, setThreadKey] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  // The message being quote-replied to, shown as a preview above the
  // input until sent or cancelled — same idea as Instagram/WhatsApp.
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  // Which message's long-press action row (Reply/Download/Delete) is
  // currently open — only one at a time.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Fullscreen tap-to-view for image/video attachments.
  const [viewer, setViewer] = useState<{ url: string; kind: "image" | "video"; messageId: string; mine: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = (id: string) => {
    pressTimer.current = setTimeout(() => setMenuFor(id), 450);
  };
  const cancelPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const openReply = (m: MessageItem) => {
    setReplyingTo(m);
    setMenuFor(null);
  };

  const deleteMessage = async (m: MessageItem) => {
    if (!user) return;
    setMenuFor(null);
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      const r = await fetch(`/api/messages/${m._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't delete", "error"); return; }
      setMessages(prev => prev.filter(x => x._id !== m._id));
      setReloadKey(k => k + 1);
      if (viewer?.messageId === m._id) setViewer(null);
    } catch {
      showToast("Network error", "error");
    }
  };

  // Fetched as a blob rather than a plain <a download> — attachment
  // URLs are cross-origin (Cloudinary), and browsers largely ignore
  // the download attribute on cross-origin links, just navigating to
  // the file instead of saving it.
  const downloadAttachment = async (url: string, kind: "image" | "video") => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `swara-${Date.now()}.${kind === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      showToast("Couldn't download", "error");
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/messages?userId=${user._id}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || !Array.isArray(d.conversations)) return;
        setFetchedConvos(d.conversations);
        setCache(convosKey, d.conversations);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id, reloadKey]);

  // Arriving via /messages?with=<id> (e.g. the Message button on
  // someone's profile) — open that thread even if no conversation
  // exists yet. Fetching their public profile gets the name/image the
  // thread header needs; GET /api/messages already returns an empty
  // message list for a conversation that doesn't exist yet.
  useEffect(() => {
    if (!user || !withId || withId === user._id) return;
    let cancelled = false;
    fetch(`/api/users/${withId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d?._id) setOpenWith({ _id: d._id, name: d.name, handle: d.handle, image: d.image }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id, withId]);

  // The fetch is inlined in the effect rather than called through a
  // helper, so the only setState happens inside a .then callback —
  // well after the effect body has returned.
  useEffect(() => {
    if (!user || !openWith) return;
    let cancelled = false;

    fetch(`/api/messages?userId=${user._id}&with=${openWith._id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.messages)) setMessages(d.messages); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?._id, openWith?._id, threadKey]);

  // Keep the newest message in view as the thread grows.
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    if (!user || !openWith) return;
    const text = draft.trim();
    if (!text && !pendingAttachment) return;

    setBusy(true);
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id, toId: openWith._id, text,
          ...(pendingAttachment ? { attachment: pendingAttachment } : {}),
          ...(replyingTo ? { replyToId: replyingTo._id } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't send", "error"); return; }

      setMessages(prev => [...prev, d.message]);
      setDraft("");
      setPendingAttachment(null);
      setReplyingTo(null);
      setShowEmoji(false);
      setReloadKey(k => k + 1);
      setThreadKey(k => k + 1);
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  };

  // Picking a file uploads it immediately and stages it as a small
  // preview above the input — the caption (if any) is whatever's
  // already typed in the draft, and Send fires both together.
  const pickAttachment = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) { showToast("Choose an image, GIF, or video", "error"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await creatorFetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "Upload failed");
      setPendingAttachment({ url: d.url, kind: isVideo ? "video" : "image" });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!user) {
    return (
      <>
        <TopBar title="Messages"/>
        <Screen>
          <EmptyState icon={<MessageSquare size={22}/>} title="Log in to see messages"
            body="Direct messages are tied to your account."
            cta={{ href: "/login", label: "Log in" }}/>
        </Screen>
      </>
    );
  }

  // ── Thread view ──
  if (openWith) {
    return (
      <>
        <TopBar title="Messages"/>
        {/* The fixed height here needs to subtract the bottom nav too,
            not just the top bar — this view isn't wrapped in <Screen>
            (which reserves that space via padding), so without it the
            input row's own bottom-nav-height margin below pushed the
            whole column taller than the actual visible viewport,
            shoving the input bar down under/behind the fixed nav. */}
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--topbar-h) - var(--nav-h))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <button onClick={() => setOpenWith(null)} aria-label="Back"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex" }}>
              <ArrowLeft size={20}/>
            </button>
            <Avatar name={openWith.name} image={openWith.image} size={32}/>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{openWith.name}</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}
            onClick={() => menuFor && setMenuFor(null)}>
            {messages.map((m, i) => {
              const mine = m.senderId === user._id;
              // A divider whenever the calendar day changes from the
              // previous message — same idea as WhatsApp/Telegram.
              const prev = messages[i - 1];
              const showDivider = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
              return (
                <Fragment key={m._id}>
                  {showDivider && (
                    <span style={{
                      alignSelf: "center", fontSize: 10.5, fontWeight: 700, color: "var(--text3)",
                      background: "var(--surface2)", padding: "4px 12px", borderRadius: 999, margin: "6px 0",
                    }}>
                      {dayLabel(m.createdAt)}
                    </span>
                  )}
                  <div
                    style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}
                    onTouchStart={() => startPress(m._id)}
                    onTouchEnd={cancelPress}
                    onTouchMove={cancelPress}
                    onMouseDown={() => startPress(m._id)}
                    onMouseUp={cancelPress}
                    onMouseLeave={cancelPress}
                  >
                  {m.replyTo && (
                    <div style={{
                      display: "flex", flexDirection: "column", gap: 1, marginBottom: 4,
                      padding: "5px 10px", borderRadius: "12px 12px 4px 4px",
                      background: mine ? "rgba(255,255,255,.18)" : "var(--surface2)",
                      borderLeft: `3px solid ${mine ? "rgba(255,255,255,.65)" : "var(--accent)"}`,
                    }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: mine ? "rgba(255,255,255,.9)" : "var(--accent)" }}>
                        {m.replyTo.senderId === user._id ? "You" : openWith.name}
                      </span>
                      <span className="truncate" style={{ fontSize: 11.5, color: mine ? "rgba(255,255,255,.8)" : "var(--text3)" }}>
                        {m.replyTo.text || (m.replyTo.attachmentKind === "video" ? "Video" : m.replyTo.attachmentKind ? "Photo" : "")}
                      </span>
                    </div>
                  )}
                  {m.storyRef && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
                      padding: "6px 10px", borderRadius: "14px 14px 4px 4px",
                      background: "var(--surface2)", border: "1px solid var(--border)",
                    }}>
                      {m.storyRef.mediaUrl ? (
                        <img src={m.storyRef.mediaUrl} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }}/>
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--grad)" }}/>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>
                        {mine ? "Replied to their story" : "Replied to your story"}
                      </span>
                    </div>
                  )}
                  {m.attachment && (
                    m.attachment.kind === "video" ? (
                      <video src={m.attachment.url} controls playsInline
                        style={{ display: "block", maxWidth: "100%", borderRadius: 14, marginBottom: m.text ? 4 : 0 }}/>
                    ) : (
                      <img src={m.attachment.url} alt="" onClick={() => setViewer({ url: m.attachment!.url, kind: "image", messageId: m._id, mine })}
                        style={{ display: "block", maxWidth: "100%", maxHeight: 260, borderRadius: 14, marginBottom: m.text ? 4 : 0, cursor: "pointer" }}/>
                    )
                  )}
                  {!!m.text && (
                    <div style={{
                      padding: "9px 13px", borderRadius: 16,
                      background: mine ? "var(--grad)" : "var(--surface2)",
                      color: mine ? "#fff" : "var(--text)",
                      fontSize: 13.5, lineHeight: 1.45,
                    }}>
                      {m.text}
                    </div>
                  )}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 3, marginTop: 3,
                    justifyContent: mine ? "flex-end" : "flex-start",
                  }}>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>{clockTime(m.createdAt)}</span>
                    {/* Ticks only make sense on your own outgoing messages —
                        one check once it's sent, two once they've read it
                        (blue-ish accent), same convention as WhatsApp. */}
                    {mine && (
                      m.read
                        ? <CheckCheck size={13} color="var(--accent)"/>
                        : <Check size={13} color="var(--text3)"/>
                    )}
                  </div>

                  {/* Long-press (touch) or press-and-hold (mouse) on the
                      message above opens this action row — same gesture
                      as Instagram/WhatsApp, no extra "..." button needed. */}
                  {menuFor === m._id && (
                    <div style={{
                      display: "flex", gap: 6, marginTop: 5,
                      justifyContent: mine ? "flex-end" : "flex-start",
                    }}>
                      <button onClick={() => openReply(m)} className="chip"
                        style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Reply size={12}/>Reply
                      </button>
                      {m.attachment && (
                        <button onClick={() => { downloadAttachment(m.attachment!.url, m.attachment!.kind); setMenuFor(null); }}
                          className="chip" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Download size={12}/>Download
                        </button>
                      )}
                      {mine && (
                        <button onClick={() => deleteMessage(m)} className="chip"
                          style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, color: "#e5484d" }}>
                          <Trash2 size={12}/>Delete
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                </Fragment>
              );
            })}
            <div ref={endRef}/>
          </div>

          <div style={{
            borderTop: "1px solid var(--border)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}>
            {replyingTo && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 0" }}>
                <div style={{
                  flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8,
                  background: "var(--surface2)", borderRadius: 10, padding: "6px 10px",
                  borderLeft: "3px solid var(--accent)",
                }}>
                  <Reply size={14} color="var(--accent)" style={{ flex: "none" }}/>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                      {replyingTo.senderId === user._id ? "Replying to yourself" : `Replying to ${openWith.name}`}
                    </div>
                    <div className="truncate" style={{ fontSize: 12, color: "var(--text3)" }}>
                      {replyingTo.text || (replyingTo.attachment?.kind === "video" ? "Video" : replyingTo.attachment ? "Photo" : "")}
                    </div>
                  </div>
                </div>
                <button onClick={() => setReplyingTo(null)} aria-label="Cancel reply"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", flex: "none" }}>
                  <X size={16}/>
                </button>
              </div>
            )}

            {showEmoji && (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 2,
                padding: "10px 12px 4px", borderBottom: "1px solid var(--border)",
              }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setDraft(d => d + e)} aria-label={`Insert ${e}`}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 19, padding: 4, lineHeight: 1 }}>
                    {e}
                  </button>
                ))}
              </div>
            )}

            {(pendingAttachment || uploading) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 0" }}>
                {uploading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)" }}>
                    <Loader2 size={14} className="spin"/>Uploading…
                  </span>
                ) : pendingAttachment && (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    {pendingAttachment.kind === "video" ? (
                      <video src={pendingAttachment.url} style={{ height: 64, borderRadius: 10, display: "block" }}/>
                    ) : (
                      <img src={pendingAttachment.url} alt="" style={{ height: 64, borderRadius: 10, display: "block" }}/>
                    )}
                    <button onClick={() => setPendingAttachment(null)} aria-label="Remove attachment"
                      style={{
                        position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                        background: "var(--text)", color: "var(--bg)", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      <X size={12}/>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 6, padding: 12, alignItems: "center" }}>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden disabled={uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) pickAttachment(f); }}/>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Attach photo or video"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", flex: "none", padding: 6 }}>
                <Paperclip size={19}/>
              </button>
              <button onClick={() => setShowEmoji(v => !v)} aria-label="Emoji"
                style={{ background: "none", border: "none", cursor: "pointer", color: showEmoji ? "var(--accent)" : "var(--text2)", display: "flex", flex: "none", padding: 6 }}>
                <Smile size={19}/>
              </button>
              <input className="inp" value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Message…" aria-label="Message" style={{ padding: "11px 16px" }}/>
              {/* A fixed circular icon button, not the generic .btn class
                  — .btn's default padding is horizontal-only when
                  overridden for an icon-only button, which left this
                  much shorter than the input beside it. */}
              <button onClick={send} disabled={busy || uploading || (!draft.trim() && !pendingAttachment)} aria-label="Send"
                style={{
                  width: 44, height: 44, borderRadius: "50%", border: "none", flex: "none",
                  background: "var(--grad)", color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: (busy || uploading || (!draft.trim() && !pendingAttachment)) ? .55 : 1,
                }}>
                <Send size={18}/>
              </button>
            </div>
          </div>
        </div>

        {/* Fullscreen tap-to-view for image attachments, with download
            (and delete, on your own messages) actions in the header —
            same pattern as the story viewer elsewhere in the app. */}
        {viewer && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.92)", display: "flex", flexDirection: "column" }}
            onClick={() => setViewer(null)}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, padding: "16px 18px", paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => downloadAttachment(viewer.url, viewer.kind)} aria-label="Download"
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}>
                <Download size={22}/>
              </button>
              {viewer.mine && (
                <button
                  onClick={() => { const target = messages.find(x => x._id === viewer.messageId); if (target) deleteMessage(target); }}
                  aria-label="Delete"
                  style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}>
                  <Trash2 size={22}/>
                </button>
              )}
              <button onClick={() => setViewer(null)} aria-label="Close"
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}>
                <X size={22}/>
              </button>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, minHeight: 0 }}
              onClick={e => e.stopPropagation()}>
              {viewer.kind === "video" ? (
                <video src={viewer.url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }}/>
              ) : (
                <img src={viewer.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12, objectFit: "contain" }}/>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ── List view ──
  return (
    <>
      <TopBar title="Messages"/>
      <Screen>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)" }}>
          Messages
        </h1>

        {convos.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {convos.map(c => {
              const other = c.participants[0];
              if (!other) return null;
              return (
                <button key={c._id} onClick={() => setOpenWith(other)} className="card"
                  style={{ display: "flex", alignItems: "center", gap: 11, padding: 12, cursor: "pointer", textAlign: "left", width: "100%" }}>
                  <Avatar name={other.name} image={other.image} size={40}/>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="truncate" style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                      {other.name}
                    </span>
                    <span className="truncate" style={{ display: "block", fontSize: 12, color: "var(--text3)" }}>
                      {c.lastMessage?.text ?? "Say hello"}
                    </span>
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flex: "none" }}>
                    <span style={{ fontSize: 10.5, color: "var(--text3)" }}>{timeAgo(c.updatedAt)}</span>
                    {c.unread > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, borderRadius: 99, background: "var(--accent)",
                        color: "#fff", fontSize: 10, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px",
                      }}>
                        {c.unread}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<MessageSquare size={22}/>} title="No conversations yet"
            body="Open someone's profile and tap Message to start one."
            cta={{ href: "/discover", label: "Find creators" }}/>
        )}
      </Screen>
    </>
  );
}
