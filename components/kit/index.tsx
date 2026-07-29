"use client";
import Link from "next/link";
import { ReactNode } from "react";
import { ChevronRight, Play, Star, Headphones } from "lucide-react";
import { Series } from "@/types";
import { formatCount, gradientFor, waveformBars } from "@/lib/gamification";

/* eslint-disable @next/next/no-img-element */
// Covers are user-uploaded to Cloudinary and /public/uploads. next/image
// would require allow-listing every one of those hosts in next.config.ts
// first, so these use plain <img>.

export function Screen({ children }: { children: ReactNode }) {
  return <div className="screen">{children}</div>;
}

export function ScreenTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div>
      <h1 style={{
        fontFamily: "var(--ff-display)", fontSize: 26, fontWeight: 700,
        color: "var(--text)", letterSpacing: "-.02em", margin: 0,
      }}>
        {children}
      </h1>
      {sub && <p style={{ fontSize: 13, color: "var(--text3)", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

export function SectionHeader({
  title, sub, href, action = "See all", icon,
}: { title: string; sub?: string; href?: string; action?: string; icon?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
          {icon}{title}
        </div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 2 }}>{sub}</div>}
      </div>
      {href && (
        <Link href={href} style={{
          fontSize: 12.5, fontWeight: 600, color: "var(--accent)",
          textDecoration: "none", display: "flex", alignItems: "center", gap: 2, flex: "none",
        }}>
          {action}<ChevronRight size={14}/>
        </Link>
      )}
    </div>
  );
}

/** Poster tile with the language badge and play button from the mocks. */
export function ShowCard({ series, width = 132 }: { series: Series; width?: number }) {
  return (
    <Link href={`/series/${series._id}`} style={{ flex: "none", width, textDecoration: "none" }}>
      <div style={{
        width, height: width, borderRadius: 14, overflow: "hidden",
        position: "relative", background: gradientFor(series._id),
      }}>
        {series.coverImage && (
          <img src={series.coverImage} alt={series.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        )}
        {series.language && <span className="pill-badge">{series.language}</span>}
        <span style={{
          position: "absolute", right: 7, bottom: 7, width: 26, height: 26,
          borderRadius: "50%", background: "rgba(255,255,255,.9)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#5B3BAF",
        }}>
          <Play size={12} fill="currentColor"/>
        </span>
      </div>
      <div className="truncate" style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: "var(--text)" }}>
        {series.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--text3)", marginTop: 2 }}>
        <Star size={11} fill="var(--coin)" color="var(--coin)"/>
        {series.rating?.toFixed(1) ?? "—"} · {formatCount(series.totalPlays ?? 0)}
      </div>
    </Link>
  );
}

export function ShowCardSkeleton({ width = 132 }: { width?: number }) {
  return (
    <div style={{ flex: "none", width }}>
      <div className="skeleton" style={{ width, height: width, borderRadius: 14 }}/>
      <div className="skeleton" style={{ height: 12, marginTop: 8, borderRadius: 4 }}/>
      <div className="skeleton" style={{ height: 10, marginTop: 5, width: "60%", borderRadius: 4 }}/>
    </div>
  );
}

/** Square cover with gradient fallback — used by list rows. */
export function Cover({
  id, url, size = 56, radius = 12, alt = "",
}: { id: string; url?: string; size?: number; radius?: number; alt?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, overflow: "hidden",
      flex: "none", background: gradientFor(id),
    }}>
      {url && <img src={url} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
    </div>
  );
}

export function EmptyState({
  icon, title, body, cta,
}: { icon: ReactNode; title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 12, padding: "44px 20px", textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 15,
        background: "color-mix(in srgb, var(--accent) 14%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
      }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--text3)", maxWidth: 320, lineHeight: 1.6, margin: 0 }}>{body}</p>
      {cta && <Link href={cta.href} className="btn btn-primary btn-sm">{cta.label}</Link>}
    </div>
  );
}

/** Deterministic waveform — see waveformBars for why not Math.random. */
export function Waveform({
  seed, playing, height = 46, color = "rgba(255,255,255,.92)",
}: { seed: string; playing: boolean; height?: number; color?: string }) {
  const bars = waveformBars(seed);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height }}>
      {bars.map((h, i) => (
        <span key={i} style={{
          width: 3, height: `${h}%`, borderRadius: 2, background: color,
          transformOrigin: "center",
          animation: playing ? `eq .62s ease-in-out ${i * 0.045}s infinite alternate` : "none",
        }}/>
      ))}
    </div>
  );
}

export function HeadphonesBadge({ n }: { n: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text3)" }}>
      <Headphones size={11}/>{formatCount(n)}
    </span>
  );
}

/** Bottom sheet used by Post-a-story and the thought composer. */
export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end",
        justifyContent: "center",
      }}>
      <div
        onClick={e => e.stopPropagation()}
        className="sheet-in"
        role="dialog" aria-modal="true" aria-label={title}
        style={{
          width: "100%", maxWidth: 480, background: "var(--surface)",
          borderRadius: "22px 22px 0 0", padding: "18px 18px 28px",
          maxHeight: "88vh", overflowY: "auto",
        }}>
        <div style={{
          width: 38, height: 4, borderRadius: 99, background: "var(--border2)",
          margin: "0 auto 14px",
        }}/>
        <h2 style={{
          fontSize: 18, fontWeight: 700, textAlign: "center",
          color: "var(--text)", margin: "0 0 16px",
        }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
