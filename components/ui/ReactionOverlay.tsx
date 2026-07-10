"use client";

interface ReactionItem { id: number; emoji: string; }

// Floating emoji reactions used by both the host (MiniPlayer) and
// anyone who joins a listen-together session. Purely decorative —
// items are removed by the caller a couple seconds after they're added.
export default function ReactionOverlay({ reactions }: { reactions: ReactionItem[] }) {
  if (reactions.length === 0) return null;

  return (
    <>
      <div style={{ position: "fixed", bottom: 90, left: 0, right: 0, height: 220, pointerEvents: "none", zIndex: 250, overflow: "hidden" }}>
        {reactions.map(r => (
          <span key={r.id} style={{
            position: "absolute",
            left: `${10 + (Math.floor(r.id) % 80)}%`,
            bottom: 0,
            fontSize: 28,
            animation: "reactionFloatUp 2s ease-out forwards",
          }}>{r.emoji}</span>
        ))}
      </div>
      <style>{`
        @keyframes reactionFloatUp {
          0% { transform: translateY(0) scale(.8); opacity: 0; }
          15% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { transform: translateY(-170px) scale(1); opacity: 0; }
        }
      `}</style>
    </>
  );
}
