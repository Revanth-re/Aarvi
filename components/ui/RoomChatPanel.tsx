"use client";
import { useEffect, useRef, useState } from "react";
import { X, Send, Plus, Check, CheckCheck, ArrowLeft } from "lucide-react";
import Avatar from "./Avatar";
import { CHAT_EMOJIS } from "@/lib/chatEmojis";

export interface ChatMessage {
  id: string;
  clientId: string;
  userId?: string;
  name: string;
  image: string;
  text: string;
  ts: number;
  // Present = a private message to this listener's clientId. Absent =
  // visible to everyone in the room (group chat).
  toClientId?: string;
  // Sender-side delivery state. Only ever upgrades past "sent" for
  // private messages, since group chat has no single "recipient" to
  // track delivery/read against.
  status?: "sent" | "delivered" | "read";
}

interface Props {
  messages: ChatMessage[];
  selfClientId: string;
  onSend: (text: string) => void;
  onClose?: () => void;
  onBack?: () => void; // shown instead of a plain title when viewing a DM thread
  title?: string;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Shared chat panel — used for both the group room chat and private
// 1:1 threads. Which thread it's showing is entirely up to the parent
// (it just passes in the already-filtered `messages` array); this
// component only handles rendering, ticks, and composing.
export default function RoomChatPanel({ messages, selfClientId, onSend, onClose, onBack, title = "Room chat" }: Props) {
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  const renderTick = (m: ChatMessage) => {
    if (m.clientId !== selfClientId) return null;
    if (!m.toClientId) return <Check size={13} style={{ opacity: .6 }} />; // group chat: sent only
    if (m.status === "read") return <CheckCheck size={13} color="#34b7f1" />;
    if (m.status === "delivered") return <CheckCheck size={13} style={{ opacity: .6 }} />;
    return <Check size={13} style={{ opacity: .6 }} />;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--surface)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 2 }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flex: 1 }}>{title}</p>
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 4 }}>
            <X size={16} />
          </button>
        )}
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        {messages.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 20 }}>No messages yet. Say hi 👋</p>
        ) : (
          messages.map(m => {
            const isSelf = m.clientId === selfClientId;
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: isSelf ? "row-reverse" : "row", alignItems: "flex-end", gap: 7 }}>
                <Avatar name={m.name} image={m.image} size={24} />
                <div style={{ maxWidth: "72%" }}>
                  {!isSelf && <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 2 }}>{m.name}</p>}
                  <div style={{
                    background: isSelf ? "var(--accent)" : "var(--surface2)",
                    color: isSelf ? "#fff" : "var(--text)",
                    padding: "7px 11px", borderRadius: 14,
                    borderBottomRightRadius: isSelf ? 4 : 14,
                    borderBottomLeftRadius: isSelf ? 14 : 4,
                    fontSize: 13, wordBreak: "break-word",
                  }}>
                    {m.text}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: isSelf ? "flex-end" : "flex-start", marginTop: 2, padding: "0 2px" }}>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>{formatTime(m.ts)}</span>
                    {renderTick(m)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showEmojis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4, padding: "8px 10px", borderTop: "1px solid var(--border)", maxHeight: 120, overflowY: "auto", flexShrink: 0 }}>
          {CHAT_EMOJIS.map(e => (
            <button key={e} onClick={() => setText(t => t + e)}
              style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", padding: 3, borderRadius: 6 }}>
              {e}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button onClick={() => setShowEmojis(s => !s)} title="Add an emoji"
          style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border2)", background: showEmojis ? "var(--accent)" : "var(--surface2)", color: showEmojis ? "#fff" : "var(--text3)", cursor: "pointer" }}>
          <Plus size={16} />
        </button>
        <input
          className="inp"
          placeholder="Message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          style={{ flex: 1, fontSize: 13 }}
          maxLength={300}
        />
        <button onClick={send} disabled={!text.trim()}
          style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", opacity: text.trim() ? 1 : .5 }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
