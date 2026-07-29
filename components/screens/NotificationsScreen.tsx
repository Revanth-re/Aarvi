"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Sparkles, Bell, SlidersHorizontal } from "lucide-react";
import { Notification, NotificationCategory } from "@/types";
import { useApp } from "@/store";
import { timeAgo } from "@/lib/gamification";
import { Screen, EmptyState } from "@/components/kit";
import TopBar, { CoinGlyph } from "@/components/shell/TopBar";

const TABS: { key: "all" | NotificationCategory; label: string }[] = [
  { key: "all", label: "All" }, { key: "drops", label: "Drops" },
  { key: "social", label: "Social" }, { key: "coins", label: "Coins" },
];

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  drops: Radio, social: Sparkles, coins: CoinGlyph, system: SlidersHorizontal,
};

export default function NotificationsScreen() {
  const user = useApp(s => s.user);
  const [tab, setTab] = useState<"all" | NotificationCategory>("all");
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Derived rather than stored: "we have a user but no rows yet" is
  // exactly what loading means, and keeping it as state would need a
  // setState in the effect body.
  const loading = !!user && !loaded;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetch(`/api/users/${user._id}/notifications?category=${tab}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.notifications)) setItems(d.notifications); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [user?._id, tab]);

  // Opening the screen clears the unread badge — the user has seen them.
  useEffect(() => {
    if (!user) return;
    fetch(`/api/users/${user._id}/notifications/read-all`, { method: "POST" }).catch(() => {});
  }, [user?._id]);

  return (
    <>
      <TopBar title="Notifications"/>
      <Screen>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)" }}>
          Notifications
        </h1>

        <div className="rail" style={{ gap: 8 }}>
          {TABS.map(t => (
            <button key={t.key} className="chip" data-active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 16 }}/>)}
          </div>
        ) : items.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(n => {
              const Icon = ICONS[n.category] ?? Bell;
              const body = (
                <>
                  <span style={{
                    width: 34, height: 34, borderRadius: "50%", flex: "none",
                    background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
                  }}>
                    <Icon size={16}/>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                      {n.title}
                    </span>
                    {n.message && (
                      <span className="clamp-2" style={{ display: "block", fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                        {n.message}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text3)", flex: "none" }}>{timeAgo(n.createdAt)}</span>
                </>
              );

              const style: React.CSSProperties = {
                display: "flex", alignItems: "flex-start", gap: 11, padding: 13,
                textDecoration: "none",
                // Unread rows get a tinted background rather than a dot,
                // which reads better in a dense list.
                background: n.read ? "var(--surface)" : "color-mix(in srgb, var(--accent) 7%, var(--surface))",
              };

              return n.link
                ? <Link key={n._id} href={n.link} className="card" style={style}>{body}</Link>
                : <div key={n._id} className="card" style={style}>{body}</div>;
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Bell size={22}/>}
            title={user ? "Nothing here yet" : "Log in to see notifications"}
            body={user
              ? "New episodes, replies to your thoughts and coin rewards will show up here."
              : "Notifications are tied to your account."}
            cta={user ? undefined : { href: "/login", label: "Log in" }}
          />
        )}
      </Screen>
    </>
  );
}
