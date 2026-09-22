"use client";
import { Fragment, Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Send, MessageSquare, Paperclip, X, Loader2, Check, CheckCheck } from "lucide-react";
import { Conversation, MessageItem, MessageAttachment, UserNote } from "@/types";
import { NoteBubble, NoteComposer, NoteViewer } from "@/components/screens/NoteSheets";
import { useApp, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
import { timeAgo, clockTime, dayLabel } from "@/lib/gamification";
import { Screen, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";

// Instagram-style presence label.
function lastSeenLabel(at?: string | null) {
  if (!at) return "";
  const m = (Date.now() - new Date(at).getTime()) / 60000;
  if (m < 5) return "Active now";
  if (m < 60) return `Active ${Math.floor(m)}m ago`;
  if (m < 1440) return `Active ${Math.floor(m / 60)}h ago`;
  if (m < 10080) return `Active ${Math.floor(m / 1440)}d ago`;
  return "";
}

// Full-screen viewer for chat photos / videos / audio.
function MediaViewer({ a, onClose }: { a: MessageAttachment; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: "calc(14px + env(safe-area-inset-top, 0px))", right: 14, background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 38, height: 38, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20}/></button>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: "100vw", maxHeight: "100vh", display: "flex" }}>
        {a.kind === "video" ? <video src={a.url} controls autoPlay playsInline style={{ maxWidth: "100vw", maxHeight: "100vh" }}/>
          : a.kind === "audio" ? <audio src={a.url} controls autoPlay style={{ width: "min(420px, 90vw)" }}/>
          : <img src={a.url} alt="" style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" }}/>}
      </div>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */

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

  const [convos, setConvos] = useState<Conversation[]>([]);
  const [convosLoaded, setConvosLoaded] = useState(false);
  const [openWith, setOpenWith] = useState<Conversation["participants"][0] | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Bumped after sending, to re-run the thread fetch.
  const [threadKey, setThreadKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewer, setViewer] = useState<MessageAttachment | null>(null);
  const [peerSeen, setPeerSeen] = useState<string | null>(null);
  const [myNote, setMyNote] = useState<UserNote | null>(null);
  const [composing, setComposing] = useState(false);
  const [viewNote, setViewNote] = useState<{ note: UserNote; name: string; mine?: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/messages?userId=${user._id}`)
      .then(r => r.json())
      .then(d => { if (cancelled) return; if (Array.isArray(d.conversations)) setConvos(d.conversations); setMyNote(d.myNote ?? null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setConvosLoaded(true); });
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
      .then(d => { if (cancelled) return; if (Array.isArray(d.messages)) setMessages(d.messages); setPeerSeen(d.peerLastSeenAt ?? null); })
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
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't send", "error"); return; }

      setMessages(prev => [...prev, d.message]);
      setDraft("");
      setPendingAttachment(null);
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
    const isAudio = file.type.startsWith("audio/");
    if (!isImage && !isVideo && !isAudio) { showToast("Choose an image, video, or audio file", "error"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await creatorFetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "Upload failed");
      setPendingAttachment({ url: d.url, kind: isVideo ? "video" : isAudio ? "audio" : "image" });
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
            shoving the input bar down under/behind the fixed nav.
            Also subtracts --nav-float-gap: the nav floats up off the
            screen edge by that much (see .dock in globals.css), so its
            real footprint is taller than --nav-h alone — without this
            the composer's bottom few pixels sat behind the nav. */}
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--topbar-h) - var(--nav-h) - var(--nav-float-gap))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <button onClick={() => setOpenWith(null)} aria-label="Back"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex" }}>
              <ArrowLeft size={20}/>
            </button>
            <Avatar name={openWith.name} image={openWith.image} size={32}/>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{openWith.name}</span>
              {!!lastSeenLabel(peerSeen) && <span style={{ fontSize: 11, color: "var(--text3)" }}>{lastSeenLabel(peerSeen)}</span>}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
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
                  <div style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
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
                    m.attachment.kind === "audio" ? (
                      <audio src={m.attachment.url} controls style={{ display: "block", maxWidth: "100%", marginBottom: m.text ? 4 : 0 }}/>
                    ) : m.attachment.kind === "video" ? (
                      <div onClick={() => setViewer(m.attachment!)} style={{ position: "relative", cursor: "pointer", marginBottom: m.text ? 4 : 0 }}>
                        <video src={m.attachment.url} muted playsInline preload="metadata"
                          style={{ display: "block", maxWidth: "100%", maxHeight: 260, borderRadius: 14, pointerEvents: "none" }}/>
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 30, textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>▶</span>
                      </div>
                    ) : (
                      <img src={m.attachment.url} alt="" onClick={() => setViewer(m.attachment!)} style={{ display: "block", cursor: "zoom-in", maxWidth: "100%", maxHeight: 260, borderRadius: 14, marginBottom: m.text ? 4 : 0 }}/>
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
                  </div>
                </Fragment>
              );
            })}
            <div ref={endRef}/>
          </div>
          {viewer && <MediaViewer a={viewer} onClose={() => setViewer(null)}/>}

          <div style={{
            borderTop: "1px solid var(--border)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}>
            {(pendingAttachment || uploading) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 0" }}>
                {uploading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)" }}>
                    <Loader2 size={14} className="spin"/>Uploading…
                  </span>
                ) : pendingAttachment && (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    {pendingAttachment.kind === "audio" ? (
                      <span style={{ fontSize: 12, color: "var(--text2)", padding: "8px 12px", background: "var(--surface2)", borderRadius: 10, display: "block" }}>🎵 Audio ready</span>
                    ) : pendingAttachment.kind === "video" ? (
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
              <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" hidden disabled={uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) pickAttachment(f); }}/>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Attach photo or video"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", flex: "none", padding: 6 }}>
                <Paperclip size={19}/>
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

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 90 }}>
          <NoteBubble note={myNote} fallback="Note…" onClick={() => myNote ? setViewNote({ note: myNote, name: "Your", mine: true }) : setComposing(true)}/>
          <button onClick={() => setComposing(true)} aria-label="Edit your note" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Avatar name={user.name} image={user.image} size={60}/>
          </button>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>Your note</span>
        </div>
        {composing && <NoteComposer userId={user._id} initial={myNote} onClose={() => setComposing(false)} onSaved={setMyNote}/>}
        {viewNote && <NoteViewer note={viewNote.note} name={viewNote.name}
          onClose={() => setViewNote(null)} onEdit={viewNote.mine ? () => { setViewNote(null); setComposing(true); } : undefined}/>}

        {!convosLoaded ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 54, borderRadius: 12 }}/>)}
          </div>
        ) : convos.length ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {convos.map((c, i) => {
              const other = c.participants[0];
              if (!other) return null;
              return (
                <button key={c._id} onClick={() => setOpenWith(other)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 2px",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    background: "none", border: "none",
                    borderBottom: i < convos.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                  <span style={{ position: "relative", flex: "none", paddingTop: other.note ? 22 : 0 }}>
                    {other.note && (
                      <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 1, lineHeight: 1 }}>
                        <NoteBubble note={other.note} onClick={e => { e.stopPropagation(); setViewNote({ note: other.note!, name: other.name }); }}/>
                      </span>
                    )}
                    <Avatar name={other.name} image={other.image} size={54}/>
                    {lastSeenLabel(other.lastSeenAt) === "Active now" && (
                      <span style={{ position: "absolute", right: 1, bottom: 1, width: 13, height: 13, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--bg)" }}/>
                    )}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="truncate" style={{ display: "block", fontSize: 14, fontWeight: c.unread > 0 ? 700 : 600, color: "var(--text)" }}>
                      {other.name}
                    </span>
                    <span className="truncate" style={{
                      display: "block", fontSize: 12.5, marginTop: 2,
                      color: c.unread > 0 ? "var(--text)" : "var(--text3)",
                      fontWeight: c.unread > 0 ? 600 : 400,
                    }}>
                      {c.lastMessage?.text ?? "Say hello"} · {c.unread > 0 || !lastSeenLabel(other.lastSeenAt) ? timeAgo(c.updatedAt) : lastSeenLabel(other.lastSeenAt)}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent)", flex: "none" }}/>
                  )}
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
