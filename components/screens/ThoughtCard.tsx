"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Clock } from "lucide-react";
import { Thought } from "@/types";
import { useApp, useToast, usePlayer } from "@/store";
import { formatCount, formatTime, timeAgo } from "@/lib/gamification";
import Avatar from "@/components/ui/Avatar";

/**
 * One thought in the feed. The distinguishing feature is "jump to
 * moment": every thought carries the second it was left at, so tapping
 * it seeks the player rather than just opening the episode.
 */
export default function ThoughtCard({ thought }: { thought: Thought }) {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const { ep, series, requestSeek, setEp } = usePlayer();

  const [liked, setLiked] = useState(thought.liked);
  const [count, setCount] = useState(thought.likeCount);

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

  return (
    <div className="card" style={{ padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
        <Link href={`/u/${thought.userId}`}>
          <Avatar name={thought.userName} image={thought.userImage} size={30}/>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
            {thought.userHandle}
          </div>
          <div className="truncate" style={{ fontSize: 11, color: "var(--text3)" }}>
            {thought.seriesTitle} · Ep {thought.episodeNumber} · {formatTime(thought.atSec)}
          </div>
        </div>
        <span style={{ fontSize: 11, color: "var(--text3)", flex: "none" }}>{timeAgo(thought.createdAt)}</span>
      </div>

      <p style={{
        fontSize: 13.5, color: "var(--text)", lineHeight: 1.55, margin: "0 0 11px",
        background: "var(--surface2)", padding: "10px 12px", borderRadius: 12,
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

        <span style={{ ...linkBtn, color: "var(--text3)" }}>
          <MessageCircle size={14}/>{thought.replyCount > 0 ? formatCount(thought.replyCount) : "reply"}
        </span>

        <button onClick={jump} style={{ ...linkBtn, color: "var(--accent)", marginLeft: "auto" }}>
          <Clock size={13}/> jump to moment
        </button>
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "none", border: "none", cursor: "pointer",
  fontSize: 11.5, fontWeight: 600, padding: 0, fontFamily: "inherit",
};
