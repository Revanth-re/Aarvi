"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Zap, Compass, User } from "lucide-react";
import { useApp } from "@/store";

const TABS = [
  { href: "/",         label: "Home",     Icon: Home },
  { href: "/library",  label: "Library",  Icon: Library },
  { href: "/shorts",   label: "Shorts",   Icon: Zap },
  { href: "/discover", label: "Discover", Icon: Compass },
  { href: "/profile",  label: "Profile",  Icon: User },
];

export default function BottomNav() {
  const path = usePathname();
  const tabBarStyle = useApp(s => s.settings.tabBarStyle);

  // The admin panel has its own chrome and is not part of the phone shell.
  if (path.startsWith("/admin")) return null;

  const active = (href: string) => href === "/" ? path === "/" : path.startsWith(href);

  return (
    <nav className="bottom-nav" data-style={tabBarStyle}>
      <div style={{ height: "var(--nav-h)", display: "flex", alignItems: "center" }}>
        {TABS.map(({ href, label, Icon }) => {
          const on = active(href);
          return (
            <Link key={href} href={href} className="nav-item" data-active={on}>
              <span className="nav-icon-wrap">
                <Icon size={19} strokeWidth={on ? 2.4 : 1.9}/>
              </span>
              <span style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
