"use client";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";
import { Conversation, MessageItem } from "@/types";
import { useApp, useToast } from "@/store";
import { timeAgo } from "@/lib/gamification";
import { Screen, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";

export default function MessagesScreen() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [convos, setConvos] = useState<Conversation[]>([]);
  const [openWith, setOpenWith] = useState<Conversation["participants"][0] | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Bumped after sending, to re-run the thread fetch.
  const [threadKey, setThreadKey] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/messages?userId=${user._id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.conversations)) setConvos(d.conversations); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id, reloadKey]);

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
    if (!text) return;

    setBusy(true);
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, toId: openWith._id, text }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't send", "error"); return; }

      setMessages(prev => [...prev, d.message]);
      setDraft("");
      setReloadKey(k => k + 1);
      setThreadKey(k => k + 1);
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
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
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--topbar-h))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <button onClick={() => setOpenWith(null)} aria-label="Back"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex" }}>
              <ArrowLeft size={20}/>
            </button>
            <Avatar name={openWith.name} image={openWith.image} size={32}/>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{openWith.name}</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map(m => {
              const mine = m.senderId === user._id;
              return (
                <div key={m._id} style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "78%", padding: "9px 13px", borderRadius: 16,
                  background: mine ? "var(--grad)" : "var(--surface2)",
                  color: mine ? "#fff" : "var(--text)",
                  fontSize: 13.5, lineHeight: 1.45,
                }}>
                  {m.text}
                </div>
              );
            })}
            <div ref={endRef}/>
          </div>

          <div style={{
            display: "flex", gap: 8, padding: 12,
            borderTop: "1px solid var(--border)",
            marginBottom: "calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))",
          }}>
            <input className="inp" value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Message…" aria-label="Message"/>
            <button onClick={send} disabled={busy || !draft.trim()} aria-label="Send"
              className="btn btn-primary" style={{ padding: "0 16px", flex: "none" }}>
              <Send size={16}/>
            </button>
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
