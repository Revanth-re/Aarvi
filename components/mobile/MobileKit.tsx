"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { ChevronRight, Headphones } from "lucide-react";
import { Series } from "@/types";
import { formatCount, gradientFor } from "@/lib/gamification";

// Shared building blocks for the mobile screens. Everything here reads
// from the app's CSS theme variables (--accent, --surface, --text…)
// rather than hardcoded colors, so all 12 of the existing themes keep
// working on the new screens.

export function Screen({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: "16px 16px 12px",
      display: "flex", flexDirection: "column", gap: 22,
      // Clears the bottom tab bar (64px) + mini player (70px).
      paddingBottom: 150,
    }}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title, icon, href, action,
}: { title: string; icon?: ReactNode; href?: string; action?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 10,
    }}>
      <div style={{
        fontSize: 14, fontWeight: 700, color: "var(--text)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {icon}{title}
      </div>
      {href && (
        <Link href={href} style={{
          fontSize: 12, color: "var(--accent)", fontWeight: 600,
          textDecoration: "none", display: "flex", alignItems: "center", gap: 2,
        }}>
          {action || "See all"}<ChevronRight size={13}/>
        </Link>
      )}
    </div>
  );
}

/** Horizontally scrolling row. Scrollbar hidden via the `.no-scroll` utility. */
export function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="no-scroll" style={{
      display: "flex", gap: 12, overflowX: "auto",
      paddingBottom: 4, scrollSnapType: "x proximity",
    }}>
      {children}
    </div>
  );
}

export function Chip({
  label, active, onClick,
}: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: "none", padding: "7px 14px", borderRadius: 999,
      fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      fontFamily: "var(--ff-sans)",
      background: active ? "var(--accent)" : "var(--surface)",
      color: active ? "#fff" : "var(--text2)",
      border: `1px solid ${active ? "var(--accent)" : "var(--border2)"}`,
      transition: "all .15s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

/** Square show tile used by the Trending / Fresh drops rails. */
export function ShowCard({ series, size = 132 }: { series: Series; size?: number }) {
  return (
    <Link href={`/series/${series._id}`} style={{
      flex: "none", width: size, textDecoration: "none", scrollSnapAlign: "start",
    }}>
      <div style={{
        width: size, height: size, borderRadius: 16, overflow: "hidden",
        position: "relative", background: gradientFor(series._id),
      }}>
        {series.coverImage && (
          // Plain <img>: covers are user-uploaded to Cloudinary and to
          // /public/uploads, and next/image would need every one of
          // those hosts allow-listed in next.config.ts first.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={series.coverImage} alt={series.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        )}
        {series.totalPlays > 0 && (
          <div style={{
            position: "absolute", bottom: 6, left: 6,
            background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)",
            color: "#fff", fontSize: 9.5, fontWeight: 700,
            padding: "3px 7px", borderRadius: 999,
            display: "flex", alignItems: "center", gap: 3, pointerEvents: "none",
          }}>
            <Headphones size={10}/>{formatCount(series.totalPlays)}
          </div>
        )}
      </div>
      <div className="truncate" style={{
        fontSize: 12.5, fontWeight: 700, marginTop: 8, color: "var(--text)",
      }}>
        {series.title}
      </div>
      <div style={{ fontSize: 11, color: "var(--text3)" }}>
        {series.genre} · {series.totalEpisodes || series.episodes?.length || 0} eps
      </div>
    </Link>
  );
}

export function ShowCardSkeleton({ size = 132 }: { size?: number }) {
  return (
    <div style={{ flex: "none", width: size }}>
      <div className="skeleton" style={{ width: size, height: size, borderRadius: 16 }}/>
      <div className="skeleton" style={{ height: 12, marginTop: 8, borderRadius: 4 }}/>
      <div className="skeleton" style={{ height: 10, marginTop: 5, width: "60%", borderRadius: 4 }}/>
    </div>
  );
}

/** Full-width banner row (Rooms, creator CTA). */
export function BannerCard({
  href, onClick, icon, title, subtitle, gradient,
}: {
  href?: string; onClick?: () => void; icon: ReactNode;
  title: string; subtitle: string; gradient?: boolean;
}) {
  const inner = (
    <>
      <div style={{
        width: 42, height: 42, borderRadius: 999, flex: "none",
        background: gradient ? "rgba(255,255,255,.22)" : "var(--accent)18",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: gradient ? "#fff" : "var(--accent)",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700,
          color: gradient ? "#fff" : "var(--text)",
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 11.5,
          color: gradient ? "rgba(255,255,255,.85)" : "var(--text3)",
        }}>
          {subtitle}
        </div>
      </div>
      <ChevronRight size={16} color={gradient ? "#fff" : "var(--text3)"}/>
    </>
  );

  const style: React.CSSProperties = {
    background: gradient
      ? "linear-gradient(135deg,var(--accent),var(--accent2))"
      : "var(--surface)",
    border: gradient ? "none" : "1px solid var(--border)",
    borderRadius: 18, padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 12,
    cursor: "pointer", textDecoration: "none", width: "100%",
    textAlign: "left", fontFamily: "var(--ff-sans)",
  };

  if (href) return <Link href={href} style={style}>{inner}</Link>;
  return <button onClick={onClick} style={style}>{inner}</button>;
}

/**
 * Deterministic bar heights for the waveform.
 *
 * A hash of the seed, not Math.random() — random heights would differ
 * between the server and client renders and trip a hydration mismatch
 * on every load. Kept as a module-level pure function (rather than
 * mutating a local inside the component) so nothing is reassigned
 * during render.
 */
function waveformBars(seed: string, count = 22): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);

  const out: number[] = [];
  let state = Math.abs(h) || 1;
  for (let i = 0; i < count; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    out.push(22 + (state % 78));   // 22–99% tall
  }
  return out;
}

/** Decorative waveform bars for the Shorts feed. */
export function Waveform({ seed, playing }: { seed: string; playing: boolean }) {
  const bars = waveformBars(seed);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 3, height: 46,
    }}>
      {bars.map((height, i) => (
        <div key={i} style={{
          width: 3, height: `${height}%`, borderRadius: 2,
          background: "rgba(255,255,255,.9)",
          transformOrigin: "center",
          animation: playing ? `eq .6s ease-in-out ${i * 0.04}s infinite alternate` : "none",
        }}/>
      ))}
    </div>
  );
}
