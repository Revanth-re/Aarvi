"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlayer, useApp, useToast } from "@/store";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X,
  ChevronUp, ChevronDown, RotateCcw, RotateCw, Moon, Heart,
  Users, Copy, Share2, MessageCircle
} from "lucide-react";
import { getPusherClient } from "@/lib/pusherClient";
import { playChatDing } from "@/lib/chatSound";
import ReactionOverlay from "./ReactionOverlay";
import Avatar from "./Avatar";
import MemberList, { RoomMemberView } from "./MemberList";
import RoomChatPanel, { ChatMessage } from "./RoomChatPanel";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];
const REACTIONS = ["❤️", "😂", "😮", "🔥", "👏"];

// How often (ms) we quietly save playback position to the server so
// followers can see "X is on Episode N" on the series page.
const PROGRESS_SYNC_INTERVAL = 12000;
// How often (ms) the host re-broadcasts position to a listen-together
// room, so anyone who joins mid-episode catches up.
const ROOM_HEARTBEAT_INTERVAL = 4000;
// A listener who hasn't heartbeated in this long is considered gone.
const MEMBER_STALE_MS = 25000;
const MEMBER_PRUNE_INTERVAL = 10000;
const HOST_CLIENT_ID = "host";

type ChatMode = { type: "group" } | { type: "dm"; clientId: string; name: string; image: string };

function genRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface FollowedProfile { _id: string; name: string; image: string; }
interface RoomMember { clientId: string; userId?: string; name: string; image: string; lastSeen: number; }

export default function MiniPlayer() {
  const path = usePathname();
  const { ep, series, playing, progress, duration, volume, rate, seekRequest, setPlaying, setProgress, setDuration, setVolume, setRate, clearSeekRequest, next, prev } = usePlayer();
  const { liked, toggleLike, user, setUser } = useApp();
  const showToast = useToast(s => s.show);
  const ref = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [rIdx, setRIdx] = useState(1);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const sleepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(progress);
  const playingRef = useRef(playing);
  const epRef = useRef(ep);

  // ─── Listen together (room) state ───
  const [room, setRoom] = useState<string | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showListeners, setShowListeners] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<FollowedProfile[]>([]);
  const [invited, setInvited] = useState<string[]>([]);
  const [members, setMembers] = useState<Record<string, RoomMember>>({});

  // ─── Chat: group + private threads ───
  const [showChat, setShowChat] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>({ type: "group" });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadGroup, setUnreadGroup] = useState(0);
  const [unreadDm, setUnreadDm] = useState<Record<string, number>>({});
  const chatModeRef = useRef(chatMode);
  const showChatRef = useRef(showChat);
  const ackedReadIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { epRef.current = ep; }, [ep]);
  useEffect(() => { chatModeRef.current = chatMode; }, [chatMode]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  useEffect(() => { if (ep) setDismissed(false); }, [ep?._id]);
  useEffect(() => { if (!ref.current || !ep) return; ref.current.src = ep.audioUrl; ref.current.load(); if (playing) ref.current.play().catch(() => {}); }, [ep?._id]);
  useEffect(() => { if (!ref.current) return; playing ? ref.current.play().catch(() => {}) : ref.current.pause(); }, [playing]);
  useEffect(() => { if (ref.current) ref.current.volume = muted ? 0 : volume; }, [volume, muted]);
  useEffect(() => { if (ref.current) (ref.current as any).playbackRate = rate; }, [rate]);

  // Periodically save playback position for logged-in users, so
  // followers can see where they've gotten to on a shared series.
  useEffect(() => {
    if (!ep || !series || !user || !playing) return;
    const saveProgress = () => {
      fetch(`/api/users/${user._id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: series._id, episodeId: ep._id, position: progressRef.current }),
      }).catch(() => {});
    };
    const iv = setInterval(saveProgress, PROGRESS_SYNC_INTERVAL);
    return () => { clearInterval(iv); saveProgress(); };
  }, [ep?._id, series?._id, user?._id, playing]);

  // Load the people this user follows whenever the room modal opens,
  // so we can offer an in-app "Invite" button next to each of them.
  useEffect(() => {
    if (!showRoomModal || !user) return;
    const ids = user.following || [];
    if (ids.length === 0) { setFollowingProfiles([]); return; }
    Promise.all(
      ids.map(id => fetch(`/api/users/${id}`).then(r => r.json()).catch(() => null))
    ).then(results => setFollowingProfiles(results.filter(r => r && !r.error)));
  }, [showRoomModal, user]);

  // ─── Listen together: broadcast helper + heartbeat + reactions ───
  // `payload` is typed as `object` rather than `Record<string, unknown>`
  // on purpose — plain interfaces like ChatMessage don't have an index
  // signature, so TypeScript rejects passing them where an index
  // signature is required. `object` accepts any object shape and still
  // rules out passing a primitive by mistake.
  const broadcastEvent = useCallback((type: string, payload?: object) => {
    if (!room) return;
    fetch(`/api/rooms/${room}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload: payload || {} }),
    }).catch(() => {});
  }, [room]);

  useEffect(() => {
    if (!room || !playing) return;
    const iv = setInterval(() => {
      broadcastEvent("heartbeat", { position: progressRef.current, playing: true });
    }, ROOM_HEARTBEAT_INTERVAL);
    return () => clearInterval(iv);
  }, [room, playing, broadcastEvent]);

  useEffect(() => {
    return () => { if (room) getPusherClient().unsubscribe(`room-${room}`); };
  }, [room]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const t = setTimeout(() => setReactions(rs => rs.slice(1)), 2200);
    return () => clearTimeout(t);
  }, [reactions]);

  // Prune listeners who've gone quiet (closed the tab without firing
  // the member-leave event — e.g. a hard refresh or a dead connection).
  useEffect(() => {
    if (!room) return;
    const iv = setInterval(() => {
      const cutoff = Date.now() - MEMBER_STALE_MS;
      setMembers(m => {
        const next: Record<string, RoomMember> = {};
        for (const [k, v] of Object.entries(m)) if (v.lastSeen >= cutoff) next[k] = v;
        return next;
      });
    }, MEMBER_PRUNE_INTERVAL);
    return () => clearInterval(iv);
  }, [room]);

  // Let joiners see the live count too.
  useEffect(() => {
    if (!room) return;
    broadcastEvent("member-count", { count: Object.keys(members).length });
  }, [room, members, broadcastEvent]);

  // Clear the group-chat unread badge once the panel is actually
  // showing the group thread.
  useEffect(() => {
    if (showChat && chatMode.type === "group") setUnreadGroup(0);
  }, [showChat, chatMode]);

  // While a DM thread is open, mark any not-yet-acked incoming
  // messages in it as read (sends a "chat-read" receipt so the other
  // side's tick turns into a blue double-check) and clear its badge.
  useEffect(() => {
    if (!room || !showChat || chatMode.type !== "dm") return;
    const otherId = chatMode.clientId;
    const unacked = chatMessages.filter(m => m.toClientId === HOST_CLIENT_ID && m.clientId === otherId && !ackedReadIdsRef.current.has(m.id));
    if (unacked.length > 0) {
      unacked.forEach(m => ackedReadIdsRef.current.add(m.id));
      fetch(`/api/rooms/${room}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chat-read", payload: { messageIds: unacked.map(m => m.id), from: HOST_CLIENT_ID, to: otherId } }),
      }).catch(() => {});
    }
    setUnreadDm(m => (m[otherId] ? { ...m, [otherId]: 0 } : m));
  }, [room, showChat, chatMode, chatMessages]);

  const startRoom = () => {
    if (!series || !ep) return;
    const code = genRoomCode();
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`room-${code}`);

    channel.bind("reaction", (data: { emoji: string }) => {
      setReactions(rs => [...rs, { id: Date.now() + Math.random(), emoji: data.emoji }]);
    });

    channel.bind("chat-message", (data: ChatMessage) => {
      setChatMessages(prev => [...prev, data]);

      const isSelf = data.clientId === HOST_CLIENT_ID;
      if (isSelf) return;

      const isGroup = !data.toClientId;
      const isDmToMe = data.toClientId === HOST_CLIENT_ID;
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
        fetch(`/api/rooms/${code}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "chat-delivered", payload: { messageId: data.id, from: HOST_CLIENT_ID, to: data.clientId } }),
        }).catch(() => {});
      }
    });

    channel.bind("chat-delivered", (data: { messageId: string; to: string }) => {
      if (data.to !== HOST_CLIENT_ID) return;
      setChatMessages(prev => prev.map(m => (m.id === data.messageId && m.status !== "read") ? { ...m, status: "delivered" } : m));
    });
    channel.bind("chat-read", (data: { messageIds: string[]; to: string }) => {
      if (data.to !== HOST_CLIENT_ID) return;
      setChatMessages(prev => prev.map(m => data.messageIds.includes(m.id) ? { ...m, status: "read" } : m));
    });

    // A joiner just subscribed and asked for the current state — reply
    // with exactly where we are right now so they catch up instantly,
    // and re-announce ourselves so they see the host in their member
    // list even if they joined after our first announcement.
    channel.bind("sync-request", () => {
      fetch(`/api/rooms/${code}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sync-state",
          payload: { episodeId: epRef.current?._id, position: progressRef.current, playing: playingRef.current },
        }),
      }).catch(() => {});
      fetch(`/api/rooms/${code}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "member-join",
          payload: { clientId: HOST_CLIENT_ID, userId: user?._id, name: user?.name || "Host", image: user?.image || "" },
        }),
      }).catch(() => {});
    });

    channel.bind("member-join", (data: { clientId: string; userId?: string; name: string; image: string }) => {
      if (!data.clientId || data.clientId === HOST_CLIENT_ID) return;
      setMembers(m => ({ ...m, [data.clientId]: { ...data, lastSeen: Date.now() } }));
    });
    channel.bind("member-heartbeat", (data: { clientId: string; userId?: string; name: string; image: string }) => {
      if (!data.clientId || data.clientId === HOST_CLIENT_ID) return;
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

    // Announce the host so joiners can see who they're listening with.
    fetch(`/api/rooms/${code}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "member-join",
        payload: { clientId: HOST_CLIENT_ID, userId: user?._id, name: user?.name || "Host", image: user?.image || "" },
      }),
    }).catch(() => {});

    setMembers({});
    setChatMessages([]);
    setUnreadGroup(0);
    setUnreadDm({});
    setChatMode({ type: "group" });
    setShowChat(false);
    setShowListeners(false);
    ackedReadIdsRef.current = new Set();
    setRoom(code);
    setInvited([]);
    setShowRoomModal(true);
  };

  const stopRoom = () => {
    if (room) {
      fetch(`/api/rooms/${room}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "room-ended", payload: {} }),
      }).catch(() => {});
      getPusherClient().unsubscribe(`room-${room}`);
    }
    setRoom(null);
    setMembers({});
    setChatMessages([]);
    setUnreadGroup(0);
    setUnreadDm({});
    setShowChat(false);
    setShowListeners(false);
    setShowRoomModal(false);
    showToast("Listen together session ended", "info");
  };

  const roomLink = () => `${window.location.origin}/listen/${room}?seriesId=${series?._id}&episodeId=${ep?._id}`;

  const copyRoomLink = async () => {
    try { await navigator.clipboard.writeText(roomLink()); showToast("Link copied", "success"); }
    catch { showToast("Couldn't copy link", "error"); }
  };

  const shareRoomLink = async () => {
    const link = roomLink();
    if (navigator.share) {
      try { await navigator.share({ title: "Listen together on Aarvi", url: link }); } catch {}
    } else {
      copyRoomLink();
    }
  };

  // In-app invite: sends a real notification (bell + live push) to a
  // follower instead of making them wait for you to paste a link
  // somewhere else. Scoped to people you follow, since that's the
  // only way you'd have their profile to begin with.
  const inviteFollower = async (target: FollowedProfile) => {
    if (!room || !user) return;
    try {
      const res = await fetch(`/api/users/${target._id}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "room_invite",
          message: `${user.name || "Someone"} invited you to listen together — ${series?.title || "an episode"}`,
          link: roomLink(),
          fromUserId: user._id,
          fromUserName: user.name,
        }),
      });
      if (!res.ok) { showToast("Couldn't send invite", "error"); return; }
      setInvited(prev => [...prev, target._id]);
      showToast(`Invited ${target.name}`, "success");
    } catch { showToast("Network error — couldn't send invite", "error"); }
  };

  const sendChatMessage = (text: string) => {
    if (!room) return;
    const msg: ChatMessage = {
      id: genId(),
      clientId: HOST_CLIENT_ID,
      userId: user?._id,
      name: user?.name || "Host",
      image: user?.image || "",
      text,
      ts: Date.now(),
      toClientId: chatMode.type === "dm" ? chatMode.clientId : undefined,
      status: "sent",
    };
    broadcastEvent("chat-message", msg);
  };

  const openDm = (member: RoomMemberView) => {
    setChatMode({ type: "dm", clientId: member.clientId, name: member.name, image: member.image });
    setShowListeners(false);
    setShowChat(true);
  };

  const visibleChatMessages = chatMode.type === "group"
    ? chatMessages.filter(m => !m.toClientId)
    : chatMessages.filter(m => (m.toClientId === chatMode.clientId && m.clientId === HOST_CLIENT_ID) || (m.toClientId === HOST_CLIENT_ID && m.clientId === chatMode.clientId));

  const totalUnread = unreadGroup + Object.values(unreadDm).reduce((a, b) => a + b, 0);

  // Sleep timer logic
  const startSleep = useCallback((mins: number) => {
    if (sleepRef.current) clearInterval(sleepRef.current);
    setSleepMinutes(mins);
    if (mins === 0) {
      setSleepRemaining(0);
      showToast("Sleep timer off", "info");
      return;
    }
    showToast(`Sleep timer set for ${mins} min`, "success");
    const totalSec = mins * 60;
    setSleepRemaining(totalSec);
    const start = Date.now();
    sleepRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const rem = totalSec - elapsed;
      if (rem <= 0) {
        setSleepRemaining(0);
        setSleepMinutes(0);
        setPlaying(false);
        showToast("Sleep timer ended — playback paused", "info");
        if (sleepRef.current) clearInterval(sleepRef.current);
      } else {
        setSleepRemaining(rem);
      }
    }, 1000);
  }, [setPlaying, showToast]);

  useEffect(() => { return () => { if (sleepRef.current) clearInterval(sleepRef.current); }; }, []);

  // Close expanded on escape
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  const togglePlaying = () => {
    const np = !playing;
    setPlaying(np);
    broadcastEvent(np ? "play" : "pause", { position: progressRef.current });
  };

  const seekTo = useCallback((t: number) => {
    setProgress(t);
    if (ref.current) ref.current.currentTime = t;
    broadcastEvent("seek", { position: t });
  }, [broadcastEvent, setProgress]);

  // Anything elsewhere in the app (like the synced transcript view, or
  // clicking a line in it) can ask for a seek via the shared store
  // instead of needing direct access to the <audio> element.
  useEffect(() => {
    if (seekRequest == null) return;
    seekTo(seekRequest);
    clearSeekRequest();
  }, [seekRequest, seekTo, clearSeekRequest]);

  const skip = (secs: number) => {
    if (!ref.current) return;
    const t = Math.min(Math.max(ref.current.currentTime + secs, 0), duration);
    ref.current.currentTime = t;
    setProgress(t);
    broadcastEvent("seek", { position: t });
  };

  const handleNext = () => {
    next();
    if (room) {
      const state = usePlayer.getState();
      if (state.ep) broadcastEvent("episode-change", { episodeId: state.ep._id, position: 0 });
    }
  };

  const handlePrev = () => {
    prev();
    if (room) {
      const state = usePlayer.getState();
      if (state.ep) broadcastEvent("episode-change", { episodeId: state.ep._id, position: 0 });
    }
  };

  const sendReaction = (emoji: string) => {
    broadcastEvent("reaction", { emoji });
  };

  // Hidden entirely inside admin, and inside a listen-together session
  // (that page has its own dedicated, host-controlled mini-player).
  const hiddenRoute = path.startsWith("/admin") || path.startsWith("/listen");

  if (hiddenRoute || !ep || dismissed) return <ReactionOverlay reactions={reactions} />;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  const isLiked = series ? (user ? (user.favorites || []).includes(series._id) : liked.includes(series._id)) : false;
  const memberCount = Object.keys(members).length;

  const handleToggleLike = async () => {
    if (!series) return;
    if (!user) { toggleLike(series._id); showToast(isLiked ? "Removed from favorites" : "Saved to favorites", "success"); return; }
    setLikeBusy(true);
    try {
      const res = await fetch(`/api/users/${user._id}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: series._id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't update favorites", "error"); return; }
      setUser({ ...user, favorites: data.favorites });
      showToast(data.favorites.includes(series._id) ? "Saved to favorites" : "Removed from favorites", "success");
    } catch { showToast("Network error — couldn't update favorites", "error"); }
    finally { setLikeBusy(false); }
  };

  return (
    <>
      <audio ref={ref}
        onTimeUpdate={() => ref.current && setProgress(ref.current.currentTime)}
        onLoadedMetadata={() => ref.current && setDuration(ref.current.duration)}
        onEnded={next} preload="metadata"/>

      <ReactionOverlay reactions={reactions} />

      {/* ─── MINI BAR ─── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "var(--surface)", borderTop: "1px solid var(--border2)",
        boxShadow: "0 -4px 30px rgba(0,0,0,.3)",
      }}>
        {room && (
          <div style={{ position: "absolute", top: -28, left: 12, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
            onClick={() => setShowRoomModal(true)}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}/> LIVE · {room}{memberCount > 0 ? ` · ${memberCount} listening` : ""}
          </div>
        )}

        {/* Progress track */}
        <div style={{ height: 2, background: "var(--border)", cursor: "pointer", position: "relative" }}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * duration); }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,var(--accent),var(--accent2))", width: `${pct}%`, transition: "width .15s" }}/>
        </div>

        <div className="container" style={{ height: 68, display: "flex", alignItems: "center", gap: 12 }}>
          {/* Art + info */}
          <div onClick={() => setExpanded(true)} style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0, cursor: "pointer" }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, overflow: "hidden", background: "var(--surface2)", flexShrink: 0, position: "relative" }}>
              {series?.coverImage && <img src={series.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
              {playing && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="eq"><span style={{height:8}}/><span/><span/><span style={{height:10}}/></div>
                </div>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep.title}</p>
              <p style={{ fontSize: 11, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{series?.title} · Ep {ep.episodeNumber}</p>
            </div>
          </div>

          {/* Like */}
          <button onClick={handleToggleLike} disabled={likeBusy} title={isLiked ? "Remove from favorites" : "Save to favorites"}
            style={{ background: "none", border: "none", cursor: "pointer", color: isLiked ? "var(--accent2)" : "var(--text3)", padding: 8, display: "flex", borderRadius: 8, flexShrink: 0 }}>
            <Heart size={17} fill={isLiked ? "currentColor" : "none"}/>
          </button>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={handlePrev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 8, display: "flex", borderRadius: 8 }}><SkipBack size={17}/></button>
            <button onClick={togglePlaying} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px var(--accent)44" }}>
              {playing ? <Pause size={16} color="#fff" fill="#fff"/> : <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }}/>}
            </button>
            <button onClick={handleNext} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", padding: 8, display: "flex", borderRadius: 8 }}><SkipForward size={17}/></button>
          </div>

          {/* Time */}
          <span className="hide-mobile" style={{ fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>
            {fmt(progress)} / {fmt(duration)}
          </span>

          {/* Speed */}
          <button className="hide-mobile" onClick={() => { const n = (rIdx + 1) % RATES.length; setRIdx(n); setRate(RATES[n]); }}
            style={{ padding: "4px 9px", borderRadius: 6, background: RATES[rIdx] !== 1 ? "var(--accent)" : "var(--surface2)", color: RATES[rIdx] !== 1 ? "#fff" : "var(--text3)", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "var(--ff-mono)", fontWeight: 500 }}>
            {RATES[rIdx]}×
          </button>

          {/* Volume */}
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setMuted(!muted)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex" }}>
              {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
            </button>
            <div style={{ width: 72 }}><input type="range" min={0} max={1} step={.05} value={muted ? 0 : volume} onChange={e => setVolume(+e.target.value)}/></div>
          </div>

          {/* Expand */}
          <button onClick={() => setExpanded(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 8 }}>
            <ChevronUp size={16}/>
          </button>

          {/* Dismiss */}
          <button onClick={() => { setPlaying(false); setDismissed(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 8 }}>
            <X size={16}/>
          </button>
        </div>
      </div>

      {/* ─── FULL PLAYER MODAL ─── */}
      {expanded && (
        <div
          className="full-player-overlay"
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "var(--bg)", overflowY: "auto",
            animation: "slideUp .35s cubic-bezier(.22,1,.36,1) both",
          }}
        >
          {/* Top bar */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px",
            background: "linear-gradient(180deg, var(--bg) 60%, transparent)",
          }}>
            <button onClick={() => setExpanded(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 4 }}>
              <ChevronDown size={24}/>
            </button>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Now Playing
            </p>
            <button onClick={handleToggleLike} disabled={likeBusy} title={isLiked ? "Remove from favorites" : "Save to favorites"}
              style={{ background: "none", border: "none", cursor: "pointer", color: isLiked ? "var(--accent2)" : "var(--text3)", display: "flex", padding: 4 }}>
              <Heart size={22} fill={isLiked ? "currentColor" : "none"}/>
            </button>
          </div>

          {/* Content */}
          <div style={{ maxWidth: 420, margin: "0 auto", padding: "0 24px 120px" }}>
            {/* Cover Art */}
            <div style={{
              width: "100%", aspectRatio: "1", borderRadius: 20, overflow: "hidden",
              background: "var(--surface2)", marginBottom: 32,
              boxShadow: "0 20px 60px rgba(0,0,0,.5)",
            }}>
              {series?.coverImage && (
                <img src={series.coverImage} alt={ep.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              )}
            </div>

            {/* Title & Series */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6, lineHeight: 1.3 }}>{ep.title}</h2>
              <Link href={series ? `/series/${series._id}` : "#"} style={{ fontSize: 14, color: "var(--accent)", textDecoration: "none" }}>
                {series?.title} · Episode {ep.episodeNumber}
              </Link>
            </div>

            {/* Seek bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--surface2)", cursor: "pointer" }}
                onClick={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  seekTo(((e.clientX - r.left) / r.width) * duration);
                }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                  width: `${pct}%`, transition: "width .1s",
                }}/>
                <div style={{
                  position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
                  left: `${pct}%`, width: 16, height: 16, borderRadius: "50%",
                  background: "var(--accent)", boxShadow: "0 0 10px var(--accent)",
                  transition: "left .1s",
                }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text3)" }}>{fmt(progress)}</span>
                <span style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text3)" }}>{fmt(duration)}</span>
              </div>
            </div>

            {/* Main controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 32 }}>
              {/* Skip -10s */}
              <button onClick={() => skip(-10)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }} title="Back 10s">
                <RotateCcw size={26}/>
                <span style={{ position: "absolute", fontSize: 8, fontWeight: 700, color: "var(--text2)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>10</span>
              </button>

              {/* Prev */}
              <button onClick={handlePrev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", padding: 4 }}>
                <SkipBack size={28} fill="var(--text)"/>
              </button>

              {/* Play/Pause */}
              <button onClick={togglePlaying} style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 24px rgba(124,106,247,.4)",
                transition: "transform .15s, box-shadow .15s",
              }}>
                {playing ? <Pause size={28} color="#fff" fill="#fff"/> : <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 3 }}/>}
              </button>

              {/* Next */}
              <button onClick={handleNext} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", padding: 4 }}>
                <SkipForward size={28} fill="var(--text)"/>
              </button>

              {/* Skip +10s */}
              <button onClick={() => skip(10)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }} title="Forward 10s">
                <RotateCw size={26}/>
                <span style={{ position: "absolute", fontSize: 8, fontWeight: 700, color: "var(--text2)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>10</span>
              </button>
            </div>

            {/* Secondary controls row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-around",
              padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
              marginBottom: 24,
            }}>
              {/* Like */}
              <button
                onClick={handleToggleLike}
                disabled={likeBusy}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                <div style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: isLiked ? "var(--accent2)" : "var(--surface2)",
                  color: isLiked ? "#fff" : "var(--text2)",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Heart size={16} fill={isLiked ? "currentColor" : "none"}/>
                </div>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>{isLiked ? "Saved" : "Save"}</span>
              </button>

              {/* Speed */}
              <button
                onClick={() => { const n = (rIdx + 1) % RATES.length; setRIdx(n); setRate(RATES[n]); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                <div style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: RATES[rIdx] !== 1 ? "var(--accent)" : "var(--surface2)",
                  color: RATES[rIdx] !== 1 ? "#fff" : "var(--text2)",
                  fontSize: 14, fontFamily: "var(--ff-mono)", fontWeight: 600,
                }}>
                  {RATES[rIdx]}×
                </div>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>Speed</span>
              </button>

              {/* Volume */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <button onClick={() => setMuted(!muted)} style={{
                  padding: "6px 14px", borderRadius: 8, background: "var(--surface2)",
                  border: "none", cursor: "pointer", color: muted ? "var(--accent)" : "var(--text2)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                </button>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>
                  {muted ? "Muted" : `${Math.round(volume * 100)}%`}
                </span>
              </div>

              {/* Sleep timer */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowSleepPicker(!showSleepPicker)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    background: "none", border: "none", cursor: "pointer",
                  }}
                >
                  <div style={{
                    padding: "6px 14px", borderRadius: 8,
                    background: sleepMinutes > 0 ? "var(--accent)" : "var(--surface2)",
                    color: sleepMinutes > 0 ? "#fff" : "var(--text2)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Moon size={16}/>
                    {sleepMinutes > 0 && <span style={{ fontSize: 12, fontFamily: "var(--ff-mono)", fontWeight: 600 }}>{fmt(sleepRemaining)}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>Sleep</span>
                </button>

                {/* Sleep picker dropdown */}
                {showSleepPicker && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                    background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 12,
                    padding: 6, minWidth: 130, boxShadow: "0 8px 32px rgba(0,0,0,.5)",
                    animation: "fadeUp .2s ease-out both", zIndex: 10,
                  }}>
                    {SLEEP_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { startSleep(opt.value); setShowSleepPicker(false); }}
                        style={{
                          display: "block", width: "100%", padding: "8px 14px", border: "none",
                          background: sleepMinutes === opt.value ? "var(--accent)22" : "transparent",
                          color: sleepMinutes === opt.value ? "var(--accent)" : "var(--text2)",
                          fontSize: 13, fontWeight: 500, borderRadius: 8, cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Listen together */}
              <button
                onClick={() => room ? setShowRoomModal(true) : startRoom()}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                <div style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: room ? "var(--accent)" : "var(--surface2)",
                  color: room ? "#fff" : "var(--text2)",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Users size={16}/>
                </div>
                <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>{room ? "Live" : "Together"}</span>
              </button>
            </div>

            {/* Reaction row — only while a room is active */}
            {room && (
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24 }}>
                {REACTIONS.map(e => (
                  <button key={e} onClick={() => sendReaction(e)}
                    style={{ fontSize: 20, background: "var(--surface2)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer" }}>
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* Volume slider (full player) */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px" }}>
              <VolumeX size={14} style={{ color: "var(--text3)", flexShrink: 0 }}/>
              <input type="range" min={0} max={1} step={.05} value={muted ? 0 : volume}
                onChange={e => { setVolume(+e.target.value); setMuted(false); }}
                style={{ flex: 1 }}/>
              <Volume2 size={14} style={{ color: "var(--text3)", flexShrink: 0 }}/>
            </div>
          </div>
        </div>
      )}

      {/* ─── Listen together room modal (link/invite/end only) ─── */}
      {showRoomModal && room && (
        <div
          onClick={() => setShowRoomModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div className="card" style={{ padding: 24, width: "100%", maxWidth: 380, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 12, color: "var(--text3)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 10 }}>Listen together</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: 3, marginBottom: 10, fontFamily: "var(--ff-mono)" }}>{room}</p>

            <button
              onClick={() => { setShowListeners(true); }}
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 18 }}
            >
              <Users size={13}/> {memberCount === 0 ? "No one's joined yet" : `${memberCount} listening — view`}
            </button>

            {followingProfiles.length > 0 && (
              <div style={{ textAlign: "left", marginBottom: 18 }}>
                <p style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: .4, marginBottom: 8 }}>Invite a follower</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {followingProfiles.map(f => (
                    <div key={f._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "var(--surface2)" }}>
                      <Avatar name={f.name} image={f.image} size={22} />
                      <span style={{ flex: 1, fontSize: 13, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                      <button className="btn btn-ghost btn-xs" disabled={invited.includes(f._id)} onClick={() => inviteFollower(f)}>
                        {invited.includes(f._id) ? "Invited" : "Invite"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={copyRoomLink}><Copy size={13}/>Copy link</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={shareRoomLink}><Share2 size={13}/>Share</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 18 }}>
              {followingProfiles.length > 0 ? "Or share this link with anyone else — you stay in control of playback." : "Anyone with this link joins in sync — you stay in control of playback."}
            </p>
            <button className="btn btn-danger btn-sm" style={{ width: "100%" }} onClick={stopRoom}>End session</button>
          </div>
        </div>
      )}

      {/* ─── Listeners — its own section, separate from the link/invite card ─── */}
      {showListeners && room && (
        <div
          onClick={() => setShowListeners(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 520, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 360 }}>
            <MemberList
              members={Object.values(members).map(m => ({ clientId: m.clientId, userId: m.userId, name: m.name, image: m.image }))}
              onOpenDm={openDm}
              unreadByClientId={unreadDm}
            />
          </div>
        </div>
      )}

      {/* ─── Floating chat launcher — anchored bottom-right corner ─── */}
      {room && (
        <>
          <button
            onClick={() => setShowChat(s => !s)}
            style={{ position: "fixed", right: 20, bottom: 84, zIndex: 450, width: 52, height: 52, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(0,0,0,.4)" }}
            title="Group chat"
          >
            <MessageCircle size={22} color="#fff" />
            {totalUnread > 0 && !showChat && (
              <span style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, padding: "0 4px", borderRadius: "50%", background: "var(--accent2)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </button>

          {showChat && (
            <div style={{ position: "fixed", right: 20, bottom: 148, zIndex: 450, width: "min(360px, calc(100vw - 40px))", height: 460, boxShadow: "0 10px 40px rgba(0,0,0,.5)", borderRadius: 14 }}>
              <RoomChatPanel
                messages={visibleChatMessages}
                selfClientId={HOST_CLIENT_ID}
                onSend={sendChatMessage}
                onClose={() => setShowChat(false)}
                onBack={chatMode.type === "dm" ? () => setChatMode({ type: "group" }) : undefined}
                title={chatMode.type === "group" ? `Group Chat${unreadGroup > 0 ? "" : ""}` : chatMode.name}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
