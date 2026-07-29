"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Bell, Settings as Cog } from "lucide-react";
import { useApp } from "@/store";
import { formatCount } from "@/lib/gamification";

// The header from every screenshot: title (or wordmark on Home), coin
// pill, search, notifications with an unread dot, and settings.
export default function TopBar({
  title, wordmark = false,
}: { title: string; wordmark?: boolean }) {
  const user = useApp(s => s.user);
  const [coins, setCoins] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetch(`/api/coins?userId=${user._id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && typeof d.coins === "number") setCoins(d.coins); })
      .catch(() => {});

    fetch(`/api/users/${user._id}/notifications?category=all`)
      .then(r => r.json())
      .then(d => { if (!cancelled && typeof d.unread === "number") setUnread(d.unread); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?._id]);

  return (
    <header className="topbar">
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flex: 1, minWidth: 0 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 7, background: "var(--grad)",
          display: "inline-block", flex: "none",
        }}/>
        <span className={wordmark ? "grad-text" : ""} style={{
          fontFamily: "var(--ff-display)",
          fontSize: wordmark ? 17 : 16,
          fontWeight: 700,
          letterSpacing: wordmark ? ".06em" : "-.01em",
          color: wordmark ? undefined : "var(--text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {wordmark ? "SWARA FM" : title}
        </span>
      </Link>

      <Link href="/coins" aria-label="Coins" style={{
        display: "flex", alignItems: "center", gap: 5, textDecoration: "none",
        background: "color-mix(in srgb, var(--coin) 16%, transparent)",
        border: "1px solid color-mix(in srgb, var(--coin) 32%, transparent)",
        borderRadius: "var(--r-pill)", padding: "5px 11px",
        fontSize: 12.5, fontWeight: 700, color: "var(--coin)", flex: "none",
      }}>
        <CoinGlyph/>{formatCount(coins)}
      </Link>

      <Link href="/search" aria-label="Search" style={{ color: "var(--text2)", display: "flex", flex: "none" }}>
        <Search size={20}/>
      </Link>

      <Link href="/notifications" aria-label="Notifications" style={{ color: "var(--text2)", display: "flex", position: "relative", flex: "none" }}>
        <Bell size={20}/>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -1, right: -1, width: 8, height: 8,
            borderRadius: "50%", background: "var(--accent)",
            border: "1.5px solid var(--bg2)",
          }}/>
        )}
      </Link>

      <Link href="/settings" aria-label="Settings" style={{ color: "var(--text2)", display: "flex", flex: "none" }}>
        <Cog size={20}/>
      </Link>
    </header>
  );
}

export function CoinGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="12" r="6"/>
      <path d="M15 6.3a6 6 0 0 1 0 11.4"/>
    </svg>
  );
}
