"use client";

import { Episode, Series } from "@/types";
import { Play, Pause, Lock, Clock, FileText } from "lucide-react";
import { usePlayer } from "@/store";

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function EpisodeRow({ episode, series, index }: { episode: Episode; series: Series; index: number }) {
  const { ep, playing, setEp, setPlaying } = usePlayer();
  const isCurrent = ep?._id === episode._id;
  const isCurrentPlaying = isCurrent && playing;

  const handlePlay = () => {
    if (episode.isLocked) return;
    if (isCurrent) {
      setPlaying(!playing);
    } else {
      setEp(episode, series);
    }
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer group ${episode.isLocked ? "opacity-60" : "hover:bg-[var(--color-surface-2)]"} ${isCurrent ? "bg-[var(--color-surface-2)]" : ""}`}
      style={{
        border: isCurrent ? "1px solid var(--color-accent)44" : "1px solid transparent",
      }}
      onClick={handlePlay}
    >
      {/* Number / play button */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ background: isCurrent ? "var(--color-accent)" : "var(--color-surface-2)" }}
      >
        {episode.isLocked ? (
          <Lock size={14} style={{ color: "var(--color-text-muted)" }} />
        ) : isCurrentPlaying ? (
          <div className="flex items-end gap-0.5 h-5">
            {[1,2,3].map(i => <div key={i} className="equalizer-bar w-1" style={{ height: `${6+i*3}px` }} />)}
          </div>
        ) : isCurrent ? (
          <Pause size={14} style={{ color: "var(--color-bg)" }} fill="currentColor" />
        ) : (
          <span className="text-xs font-mono group-hover:hidden block" style={{ color: "var(--color-text-muted)" }}>
            {episode.episodeNumber}
          </span>
        )}
        {!episode.isLocked && !isCurrent && (
          <Play size={14} style={{ color: "var(--color-text-muted)" }} fill="currentColor" className="hidden group-hover:block" />
        )}
      </div>

      {/* Episode info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4
            className="text-sm font-medium truncate"
            style={{ color: isCurrent ? "var(--color-accent)" : "var(--color-text)" }}
          >
            {episode.title}
          </h4>
          {episode.isLocked && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
            >
              Premium
            </span>
          )}
        </div>
        {episode.description && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
            {episode.description}
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {episode.transcript && (
          <FileText size={14} style={{ color: "var(--color-text-muted)" }} />
        )}
        <div className="flex items-center gap-1">
          <Clock size={12} style={{ color: "var(--color-text-muted)" }} />
          <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
            {formatDuration(episode.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}


