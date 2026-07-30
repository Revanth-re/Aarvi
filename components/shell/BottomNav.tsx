"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Library, Zap, Compass, MessageSquare, User } from "lucide-react";
import { useApp } from "@/store";

const TABS = [
  { href: "/",         label: "Home",     Icon: Home },
  { href: "/library",  label: "Library",  Icon: Library },
  { href: "/shorts",   label: "Shorts",   Icon: Zap },
  { href: "/discover", label: "Discover", Icon: Compass },
  { href: "/messages", label: "Messages", Icon: MessageSquare },
  { href: "/profile",  label: "Profile",  Icon: User },
];

export default function BottomNav() {
  const path = usePathname();
  const user = useApp(s => s.user);
  const tabBarStyle = useApp(s => s.settings.tabBarStyle);
  const [unreadDms, setUnreadDms] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user) { queueMicrotask(() => { if (!cancelled) setUnreadDms(0); }); return () => { cancelled = true; }; }
    fetch(`/api/messages?userId=${user._id}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || !Array.isArray(d.conversations)) return;
        setUnreadDms(d.conversations.reduce((sum: number, c: { unread: number }) => sum + (c.unread || 0), 0));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // Re-checks on every navigation, which is cheap and keeps the badge
    // fresh right after leaving the Messages tab.
  }, [user?._id, path]);

  // The admin panel has its own chrome and is not part of the phone shell.
  if (path.startsWith("/admin")) return null;

  const active = (href: string) => href === "/" ? path === "/" : path.startsWith(href);

  return (
    <nav className="bottom-nav" data-style={tabBarStyle}>
      <div style={{ height: "var(--nav-h)", display: "flex", alignItems: "center" }}>
        {TABS.map(({ href, label, Icon }) => {
          const on = active(href);
          const badge = href === "/messages" ? unreadDms : 0;
          return (
            <Link key={href} href={href} className="nav-item" data-active={on}>
              <span className="nav-icon-wrap" style={{ position: "relative" }}>
                <Icon size={19} strokeWidth={on ? 2.4 : 1.9}/>
                {badge > 0 && (
                  <span style={{
                    position: "absolute", top: -3, right: -3, minWidth: 15, height: 15, borderRadius: 8,
                    background: "#FF4D6D", color: "#fff", fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
                    border: "1.5px solid var(--bg2)",
                  }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
