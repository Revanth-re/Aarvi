"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Clock, Trash2 } from "lucide-react";
import { Thought } from "@/types";
import { useApp, useToast, usePlayer } from "@/store";
import { formatCount, formatTime, timeAgo } from "@/lib/gamification";
import Avatar from "@/components/ui/Avatar";
import ThoughtComposer from "./ThoughtComposer";

/**
 * One thought in the feed. The distinguishing feature is "jump to
 * moment": every thought carries the second it was left at, so tapping
 * it seeks the player rather than just opening the episode.
 *
 * `isReply` renders the compact form used for nested replies — no
 * jump-to-moment, no further replying (threads stay one level deep),
 * just author/text/like/delete.
 */
export default function ThoughtCard({
  thought, isReply = false, onDeleted,
}: { thought: Thought; isReply?: boolean; onDeleted?: (id: string) => void }) {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const { ep, series, requestSeek, setEp } = usePlayer();

  const [liked, setLiked] = useState(thought.liked);
  const [count, setCount] = useState(thought.likeCount);
  const [replyCount, setReplyCount] = useState(thought.replyCount);
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Thought[] | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mine = user?._id === thought.userId;

  const toggleLike = async () => {
    if (!user) { showToast("Log in to like thoughts", "info"); return; }

    // Optimistic — the heart must answer the tap immediately.
    const wasLiked = liked, wasCount = count;
    setLiked(!liked);
    setCount(c => c + (liked ? -1 : 1));

    try {
      const r = await fetch(`/api/thoughts/${thought._id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setLiked(d.liked); setCount(d.likeCount);
    } catch {
      setLiked(wasLiked); setCount(wasCount);
      showToast("Couldn't save that like", "error");
    }
  };

  const jump = async () => {
    // Already playing this episode → just seek, no reload.
    if (ep?._id === thought.episodeId) { requestSeek(thought.atSec); return; }

    try {
      const r = await fetch(`/api/series/${thought.seriesId}`);
      const s = await r.json();
      const target = s?.episodes?.find((e: { _id: string }) => e._id === thought.episodeId);
      if (!target) { showToast("That episode is no longer available", "error"); return; }

      setEp(target, s);
      // The player loads asynchronously, so the seek is queued rather
      // than applied here — the store hands it over once ready.
      requestSeek(thought.atSec);
    } catch {
      showToast("Couldn't open that moment", "error");
    }
  };

  const fetchReplies = async () => {
    setLoadingReplies(true);
    try {
      const r = await fetch(`/api/thoughts?parentId=${thought._id}&limit=50`);
      const d = await r.json();
      setReplies(Array.isArray(d) ? d : []);
    } catch {
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    if (showReplies) { setShowReplies(false); return; }
    setShowReplies(true);
    if (replies === null) fetchReplies();
  };

  const remove = async () => {
    if (!user) return;
    if (!window.confirm("Delete this thought?")) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/thoughts/${thought._id}?userId=${user._id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't delete", "error"); return; }
      setDeleted(true);
      onDeleted?.(thought._id);
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (deleted) return null;

  return (
    <div className="card" style={{ padding: isReply ? 10 : 13, ...(isReply ? { background: "var(--surface2)", boxShadow: "none" } : {}) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
        <Link href={`/u/${thought.userId}`}>
          <Avatar name={thought.userName} image={thought.userImage} size={isReply ? 24 : 30}/>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
            {thought.userHandle}
          </div>
          {!isReply && (
            <div className="truncate" style={{ fontSize: 11, color: "var(--text3)" }}>
              {thought.seriesTitle} · Ep {thought.episodeNumber} · {formatTime(thought.atSec)}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--text3)", flex: "none" }}>{timeAgo(thought.createdAt)}</span>
        {mine && (
          <button onClick={remove} disabled={deleting} aria-label="Delete thought"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 0 }}>
            <Trash2 size={13}/>
          </button>
        )}
      </div>

      <p style={{
        fontSize: 13.5, color: "var(--text)", lineHeight: 1.55, margin: "0 0 11px",
        background: isReply ? "var(--surface)" : "var(--surface2)", padding: "10px 12px", borderRadius: 12,
      }}>
        {thought.text}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={toggleLike}
          aria-label={liked ? "Unlike" : "Like"}
          style={{ ...linkBtn, color: liked ? "var(--danger)" : "var(--text3)" }}>
          <Heart size={14} fill={liked ? "var(--danger)" : "none"}/>
          {formatCount(count)}
        </button>

        {!isReply && (
          <button onClick={toggleReplies} style={{ ...linkBtn, color: "var(--text3)" }}>
            <MessageCircle size={14}/>{replyCount > 0 ? `${formatCount(replyCount)} ${showReplies ? "▲" : "▼"}` : "reply"}
          </button>
        )}

        {!isReply && (
          <button onClick={() => setReplying(true)} style={{ ...linkBtn, color: "var(--text3)" }}>
            Reply
          </button>
        )}

        {!isReply && (
          <button onClick={jump} style={{ ...linkBtn, color: "var(--accent)", marginLeft: "auto" }}>
            <Clock size={13}/> jump to moment
          </button>
        )}
      </div>

      {!isReply && showReplies && (
        <div style={{ marginTop: 10, paddingLeft: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {loadingReplies ? (
            <div className="skeleton" style={{ height: 50, borderRadius: 10 }}/>
          ) : replies && replies.length ? (
            replies.map(r => (
              <ThoughtCard key={r._id} thought={r} isReply
                onDeleted={id => setReplies(prev => (prev ?? []).filter(x => x._id !== id))}/>
            ))
          ) : (
            <p style={{ fontSize: 11.5, color: "var(--text3)", margin: 0 }}>No replies yet.</p>
          )}
        </div>
      )}

      {!isReply && (
        <ThoughtComposer
          open={replying} onClose={() => setReplying(false)}
          seriesId={thought.seriesId} episodeId={thought.episodeId} atSec={thought.atSec}
          parentId={thought._id}
          onPosted={() => {
            setReplyCount(c => c + 1);
            setShowReplies(true);
            fetchReplies(); // always refetch, whether or not replies were already loaded
          }}
        />
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "none", border: "none", cursor: "pointer",
  fontSize: 11.5, fontWeight: 600, padding: 0, fontFamily: "inherit",
};
