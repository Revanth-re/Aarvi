"use client";
import { UserCircle } from "lucide-react";

// Fallback color palette for initial-letter avatars — picked deterministically
// from the user's name so the same person always gets the same color.
const COLORS = ["#7c6af7", "#22c55e", "#f59e0b", "#38bdf8", "#f43f5e", "#a78bfa", "#10b981", "#ec4899"];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface Props {
  name?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
}

/**
 * Profile avatar with a 3-tier fallback:
 *   1. Real photo (Google image) if present.
 *   2. A colored circle with the first letter of the user's first name.
 *   3. A generic person icon if there's no name at all.
 */
export default function Avatar({ name, image, size = 32, className }: Props) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className={className}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  const firstName = (name || "").trim().split(/\s+/)[0] || "";
  if (!firstName) {
    return (
      <div className={className} style={{
        width: size, height: size, borderRadius: "50%", background: "var(--surface2)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <UserCircle size={Math.round(size * 0.62)} color="var(--text3)" />
      </div>
    );
  }

  const initial = firstName[0].toUpperCase();
  const bg = colorFor(firstName);
  return (
    <div className={className} style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      color: "#fff", fontWeight: 700, fontSize: Math.round(size * 0.42),
      fontFamily: "var(--ff-sans)", lineHeight: 1,
    }}>
      {initial}
    </div>
  );
}
