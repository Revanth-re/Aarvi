"use client";
import { useState } from "react";
import { useApp, useToast } from "@/store";
import { formatTime } from "@/lib/gamification";
import { Sheet } from "@/components/kit";

/**
 * Leaves a thought pinned to a specific second of an episode.
 * `atSec` is captured when the sheet opens, so the note stays anchored
 * to the moment the user reacted to even if playback runs on while
 * they type.
 */
export default function ThoughtComposer({
  open, onClose, seriesId, episodeId, atSec, parentId, onPosted,
}: {
  open: boolean; onClose: () => void;
  seriesId: string; episodeId: string; atSec: number;
  /** Set to reply to an existing thought instead of starting a new one. */
  parentId?: string;
  onPosted?: () => void;
}) {
  const user = useApp(s => s.user);
  const publicThoughts = useApp(s => s.settings.privacy.publicThoughts);
  const showToast = useToast(s => s.show);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!user) { showToast(parentId ? "Log in to reply" : "Log in to leave a thought", "info"); return; }
    const body = text.trim();
    if (!body) { showToast("Write something first", "info"); return; }

    setBusy(true);
    try {
      const r = await fetch("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, seriesId, episodeId, atSec, text: body, parentId: parentId ?? null }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't post", "error"); return; }

      showToast(parentId ? "Reply posted" : `Thought pinned at ${formatTime(atSec)}`, "success");
      setText("");
      onPosted?.();
      onClose();
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={parentId ? "Reply" : `Thought at ${formatTime(atSec)}`}>
      <textarea
        className="inp" rows={4} value={text} maxLength={500}
        onChange={e => setText(e.target.value)}
        placeholder={parentId ? "Write a reply…" : "What did this moment do to you?"}
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          {publicThoughts ? "Visible to everyone" : "Only visible to you"}
        </span>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>{text.length}/500</span>
      </div>
      <button onClick={post} disabled={busy} className="btn btn-primary" style={{ width: "100%" }}>
        {busy ? "Posting…" : "Pin this thought"}
      </button>
    </Sheet>
  );
}
