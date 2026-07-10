"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/store";
import { Series, Episode } from "@/types";
import { getPusherClient } from "@/lib/pusherClient";
import { playChatDing } from "@/lib/chatSound";
import ReactionOverlay from "@/components/ui/ReactionOverlay";
import MemberList, { RoomMemberView } from "@/components/ui/MemberList";
import RoomChatPanel, { ChatMessage } from "@/components/ui/RoomChatPanel";
import { Play, Pause, Radio, ArrowLeft, Users, MessageCircle } from "lucide-react";

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }

const REACTIONS = ["❤️", "😂", "😮", "🔥", "👏"];
const HEARTBEAT_MS = 15000;
const MEMBER_STALE_MS = 25000;
const MEMBER_PRUNE_INTERVAL = 10000;

interface RoomMember { clientId: string; userId?: string; name: string; image: string; lastSeen: number; }
type ChatMode = { type: "group" } | { type: "dm"; clientId: string; name: string; image: string };

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ListenRoomClient() {
  const { code } = useParams() as { code: string };
  const searchParams = useSearchParams();
  const seriesId = searchParams.get("seriesId") || "";
  const episodeId = searchParams.get("episodeId") || "";
  const { user } = useApp();

  const [series, setSeries] = useState<Series | null>(null);
  const [ep, setEp] = useState<Episode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [connected, setConnected] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);
  const [joined, setJoined] = useState(false);
  const [roomEnded, setRoomEnded] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [members, setMembers] = useState<Record<string, RoomMember>>({});

  // Chat: group + private threads, mirroring the host side.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showListeners, setShowListeners] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>({ type: "group" });
  const [unreadGroup, setUnreadGroup] = useState(0);
  const [unreadDm, setUnreadDm] = useState<Record<string, number>>({});

  const audioRef = useRef<HTMLAudioElement>(null);
  const seriesRef = useRef<Series | null>(null);
  const epRef = useRef<Episode | null>(null);
  const joinedRef = useRef(false);
  const chatModeRef = useRef(chatMode);
  const showChatRef = useRef(showChat);
  const ackedReadIdsRef = useRef<Set<string>>(new Set());

  const [clientId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => { seriesRef.current = series; }, [series]);
  useEffect(() => { epRef.current = ep; }, [ep]);
  useEffect(() => { joinedRef.current = joined; }, [joined]);
  useEffect(() => { chatModeRef.current = chatMode; }, [chatMode]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  useEffect(() => {
    if (!seriesId) return;
    fetch(`/api/series/${seriesId}`)
      .then(r => r.json())
      .then(d => {
        setSeries(d);
        const found = d.episodes?.find((e: Episode) => e._id === episodeId) || d.episodes?.[0] || null;
        setEp(found);
      })
      .catch(() => {});
  }, [seriesId, episodeId]);

  // `payload` is typed as `object` rather than `Record<string, unknown>`
  // on purpose — plain interfaces like ChatMessage don't have an index
  // signature, so TypeScript rejects passing them where an index
  // signature is required. `object` accepts any object shape and still
  // rules out passing a primitive by mistake. (This is what broke the
  // Vercel build: `sendRoomEvent("chat-message", msg)` failed to
  // type-check under the stricter `Record<string, unknown>` signature.)
  const sendRoomEvent = useCallback((type: string, payload?: object) => {
    fetch(`/api/rooms/${code}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload: payload || {} }),
      keepalive: true,
    }).catch(() => {});
  }, [code]);

  const sendMemberEvent = useCallback((type: "member-join" | "member-heartbeat" | "member-leave") => {
    sendRoomEvent(type, { clientId, userId: user?._id, name: user?.name || "Guest", image: user?.image || "" });
  }, [sendRoomEvent, clientId, user?._id, user?.name, user?.image]);

  // Subscribe once on mount so we don't miss anything — but audio only
  // actually plays once `joined` is true (see below), since a real
  // <audio>.play() needs to trace back to a user gesture on THIS page
  // or the browser silently blocks it.
  useEffect(() => {
    if (!code) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`room-${code}`);
    setConnected(true);

    channel.bind("play", (data: { position: number }) => {
      setPlaying(true);
      if (joinedRef.current && audioRef.current) {
        audioRef.current.currentTime = data.position;
        audioRef.current.play().catch(() => {});
      }
    });
    channel.bind("pause", (data: { position: number }) => {
      setPlaying(false);
      if (joinedRef.current && audioRef.current) {
        audioRef.current.currentTime = data.position;
        audioRef.current.pause();
      }
    });
    channel.bind("seek", (data: { position: number }) => {
      setProgress(data.position);
      if (joinedRef.current && audioRef.current) audioRef.current.currentTime = data.position;
    });
    channel.bind("heartbeat", (data: { position: number }) => {
      if (joinedRef.current && audioRef.current && Math.abs(audioRef.current.currentTime - data.position) > 2) {
        audioRef.current.currentTime = data.position;
      }
    });
    channel.bind("episode-change", (data: { episodeId: string }) => {
      const found = seriesRef.current?.episodes?.find(e => e._id === data.episodeId);
      if (found) { setEp(found); setProgress(0); }
    });
    // Response to our own "sync-request" — sent right after joining, so
    // we catch up instantly instead of waiting for the next play/pause.
    channel.bind("sync-state", (data: { episodeId?: string; position: number; playing: boolean }) => {
      if (data.episodeId && data.episodeId !== epRef.current?._id) {
        const found = seriesRef.current?.episodes?.find(e => e._id === data.episodeId);
        if (found) setEp(found);
      }
      setProgress(data.position);
      setPlaying(data.playing);
      if (joinedRef.current && audioRef.current) {
        audioRef.current.currentTime = data.position;
        if (data.playing) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
      }
    });
    channel.bind("member-count", (data: { count: number }) => {
      setListenerCount(data.count || 0);
    });
    channel.bind("member-join", (data: { clientId: string; userId?: string; name: string; image: string }) => {
      if (!data.clientId || data.clientId === clientId) return;
      setMembers(m => ({ ...m, [data.clientId]: { ...data, lastSeen: Date.now() } }));
    });
    channel.bind("member-heartbeat", (data: { clientId: string; userId?: string; name: string; image: string }) => {
      if (!data.clientId || data.clientId === clientId) return;
      setMembers(m => ({ ...m, [data.clientId]: { ...(m[data.clientId] || data), lastSeen: Date.now() } }));
    });
    channel.bind("member-leave", (data: { clientId: string }) => {
      if (!data.clientId) return;
      setMembers(m => {
        const next = { ...m };
        delete next[data.clientId];
        return next;
      });
    });

    channel.bind("chat-message", (data: ChatMessage) => {
      setChatMessages(prev => [...prev, data]);

      const isSelf = data.clientId === clientId;
      if (isSelf) return;

      const isGroup = !data.toClientId;
      const isDmToMe = data.toClientId === clientId;
      if (!isGroup && !isDmToMe) return; // someone else's DM — not for us

      const mode = chatModeRef.current;
      const isViewing = showChatRef.current && (
        (isGroup && mode.type === "group") ||
        (isDmToMe && mode.type === "dm" && mode.clientId === data.clientId)
      );

      if (!isViewing) {
        playChatDing();
        if (isGroup) setUnreadGroup(n => n + 1);
        else setUnreadDm(m => ({ ...m, [data.clientId]: (m[data.clientId] || 0) + 1 }));
      }

      if (isDmToMe) {
        sendRoomEvent("chat-delivered", { messageId: data.id, from: clientId, to: data.clientId });
      }
    });
    channel.bind("chat-delivered", (data: { messageId: string; to: string }) => {
      if (data.to !== clientId) return;
      setChatMessages(prev => prev.map(m => (m.id === data.messageId && m.status !== "read") ? { ...m, status: "delivered" } : m));
    });
    channel.bind("chat-read", (data: { messageIds: string[]; to: string }) => {
      if (data.to !== clientId) return;
      setChatMessages(prev => prev.map(m => data.messageIds.includes(m.id) ? { ...m, status: "read" } : m));
    });

    channel.bind("room-ended", () => {
      setRoomEnded(true);
      setPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    });
    channel.bind("reaction", (data: { emoji: string }) => {
      setReactions(rs => [...rs, { id: Date.now() + Math.random(), emoji: data.emoji }]);
    });

    return () => { pusher.unsubscribe(`room-${code}`); };
  }, [code, clientId, sendRoomEvent]);

  // Once joined: announce presence, ask the host for the current
  // playback state, and keep heartbeating so the host (and everyone
  // else) knows we're still here.
  useEffect(() => {
    if (!joined) return;
    sendMemberEvent("member-join");
    sendRoomEvent("sync-request");
    const iv = setInterval(() => sendMemberEvent("member-heartbeat"), HEARTBEAT_MS);
    return () => {
      clearInterval(iv);
      sendMemberEvent("member-leave");
    };
  }, [joined, sendMemberEvent, sendRoomEvent]);

  useEffect(() => {
    if (!joined) return;
    const handler = () => sendMemberEvent("member-leave");
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [joined, sendMemberEvent]);

  // Prune listeners who've gone quiet without saying bye.
  useEffect(() => {
    const iv = setInterval(() => {
      const cutoff = Date.now() - MEMBER_STALE_MS;
      setMembers(m => {
        const next: Record<string, RoomMember> = {};
        for (const [k, v] of Object.entries(m)) if (v.lastSeen >= cutoff) next[k] = v;
        return next;
      });
    }, MEMBER_PRUNE_INTERVAL);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (reactions.length === 0) return;
    const t = setTimeout(() => setReactions(rs => rs.slice(1)), 2200);
    return () => clearTimeout(t);
  }, [reactions]);

  // Clear the group-chat unread badge once the panel is actually
  // showing the group thread.
  useEffect(() => {
    if (showChat && chatMode.type === "group") setUnreadGroup(0);
  }, [showChat, chatMode]);

  // While a DM thread is open, ack any not-yet-read incoming messages
  // in it (so the sender's tick turns blue) and clear its badge.
  useEffect(() => {
    if (!showChat || chatMode.type !== "dm") return;
    const otherId = chatMode.clientId;
    const unacked = chatMessages.filter(m => m.toClientId === clientId && m.clientId === otherId && !ackedReadIdsRef.current.has(m.id));
    if (unacked.length > 0) {
      unacked.forEach(m => ackedReadIdsRef.current.add(m.id));
      sendRoomEvent("chat-read", { messageIds: unacked.map(m => m.id), from: clientId, to: otherId });
    }
    setUnreadDm(m => (m[otherId] ? { ...m, [otherId]: 0 } : m));
  }, [showChat, chatMode, chatMessages, clientId, sendRoomEvent]);

  const sendReaction = (emoji: string) => sendRoomEvent("reaction", { emoji });

  const sendChatMessage = (text: string) => {
    const msg: ChatMessage = {
      id: genId(),
      clientId,
      userId: user?._id,
      name: user?.name || "Guest",
      image: user?.image || "",
      text,
      ts: Date.now(),
      toClientId: chatMode.type === "dm" ? chatMode.clientId : undefined,
      status: "sent",
    };
    sendRoomEvent("chat-message", msg);
  };

  const openDm = (member: RoomMemberView) => {
    setChatMode({ type: "dm", clientId: member.clientId, name: member.name, image: member.image });
    setShowListeners(false);
    setShowChat(true);
  };

  // The tap that unlocks audio playback on this page. Browsers require
  // a real user gesture before letting a page call audio.play() — this
  // silent play()+pause() right inside the click handler satisfies
  // that, and every future programmatic play() call (even from a
  // Pusher event later) keeps working after that.
  const handleJoin = async () => {
    if (audioRef.current) {
      try { await audioRef.current.play(); audioRef.current.pause(); } catch {}
    }
    setJoined(true);
  };

  if (!series || !ep) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--text3)", fontSize: 14 }}>Joining session…</p>
      </div>
    );
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const memberList = Object.values(members);
  const visibleChatMessages = chatMode.type === "group"
    ? chatMessages.filter(m => !m.toClientId)
    : chatMessages.filter(m => (m.toClientId === chatMode.clientId && m.clientId === clientId) || (m.toClientId === clientId && m.clientId === chatMode.clientId));
  const totalUnread = unreadGroup + Object.values(unreadDm).reduce((a, b) => a + b, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <audio ref={audioRef} src={ep.audioUrl} preload="metadata"
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} />

      <Link href="/" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13, marginBottom: 24 }}>
        <ArrowLeft size={14} />Leave session
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 20 }}>
          <Radio size={12} /> {connected ? `LIVE · ${code}` : "Connecting…"}
        </div>
        {listenerCount > 0 && (
          <button
            onClick={() => setShowListeners(true)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 20, padding: "5px 10px", cursor: "pointer" }}
          >
            <Users size={12} />{listenerCount}
          </button>
        )}
      </div>

      <div style={{ width: "100%", maxWidth: 340, aspectRatio: "1", borderRadius: 20, overflow: "hidden", background: "var(--surface2)", marginBottom: 24, boxShadow: "0 20px 60px rgba(0,0,0,.4)", position: "relative" }}>
        {series.coverImage && <img src={series.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}

        {roomEnded ? (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
            <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Session ended</p>
            <p style={{ color: "rgba(255,255,255,.7)", fontSize: 12, marginBottom: 16 }}>The host ended this listen-together session.</p>
            <Link href="/" className="btn btn-primary btn-sm">Back to Aarvi</Link>
          </div>
        ) : !joined ? (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
            <button onClick={handleJoin} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Play size={16} fill="#fff" />Join & Listen
            </button>
            <p style={{ color: "rgba(255,255,255,.7)", fontSize: 11, marginTop: 12 }}>Your browser needs a tap before audio can play</p>
          </div>
        ) : null}
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4, textAlign: "center" }}>{ep.title}</h1>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>{series.title} · Episode {ep.episodeNumber}</p>

      <div style={{ width: "100%", maxWidth: 340, marginBottom: 8 }}>
        <div style={{ height: 5, borderRadius: 3, background: "var(--surface2)" }}>
          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: "linear-gradient(90deg,var(--accent),var(--accent2))", transition: "width .2s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text3)" }}>{fmt(progress)}</span>
          <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text3)" }}>{fmt(duration)}</span>
        </div>
      </div>

      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        {playing ? <Pause size={22} color="var(--text2)" fill="var(--text2)" /> : <Play size={22} color="var(--text2)" fill="var(--text2)" style={{ marginLeft: 3 }} />}
      </div>
      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 24 }}>
        {joined ? "Playback is controlled by the host" : "Tap \"Join & Listen\" above to start"}
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {REACTIONS.map(e => (
          <button key={e} onClick={() => sendReaction(e)}
            style={{ fontSize: 20, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "50%", width: 44, height: 44, cursor: "pointer" }}>
            {e}
          </button>
        ))}
      </div>

      {/* ─── Listeners — its own section/overlay, separate from chat ─── */}
      {showListeners && (
        <div
          onClick={() => setShowListeners(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 520, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 360 }}>
            <MemberList
              members={memberList.map(m => ({ clientId: m.clientId, userId: m.userId, name: m.name, image: m.image }))}
              onOpenDm={openDm}
              unreadByClientId={unreadDm}
            />
          </div>
        </div>
      )}

      {/* ─── Floating chat launcher — anchored bottom-right corner ─── */}
      <button
        onClick={() => setShowChat(s => !s)}
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 450,
          width: 50, height: 50, borderRadius: "50%",
          background: "var(--accent)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 20px rgba(0,0,0,.4)",
        }}
        title="Room chat"
      >
        <MessageCircle size={20} color="#fff" />
        {totalUnread > 0 && !showChat && (
          <span style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, padding: "0 4px", borderRadius: "50%", background: "var(--accent2)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {showChat && (
        <div style={{ position: "fixed", right: 20, bottom: 84, zIndex: 450, width: "min(360px, calc(100vw - 40px))", height: "min(460px, calc(100vh - 140px))", boxShadow: "0 10px 40px rgba(0,0,0,.5)", borderRadius: 14 }}>
          <RoomChatPanel
            messages={visibleChatMessages}
            selfClientId={clientId}
            onSend={sendChatMessage}
            onClose={() => setShowChat(false)}
            onBack={chatMode.type === "dm" ? () => setChatMode({ type: "group" }) : undefined}
            title={chatMode.type === "group" ? "Group Chat" : chatMode.name}
          />
        </div>
      )}

      <ReactionOverlay reactions={reactions} />
    </div>
  );
}
