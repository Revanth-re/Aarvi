"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Clapperboard, Library, User } from "lucide-react";

// Mobile bottom tab bar. Rendered on every screen under 769px wide and
// hidden above it (see `.bottom-nav` in app/globals.css), so the
// existing desktop navbar experience is completely untouched.

const TABS = [
  { href: "/",         label: "Home",     Icon: Home },
  { href: "/discover", label: "Discover", Icon: Compass },
  { href: "/shorts",   label: "Shorts",   Icon: Clapperboard },
  { href: "/library",  label: "Library",  Icon: Library },
  { href: "/profile",  label: "Profile",  Icon: User },
];

export default function BottomNav() {
  const path = usePathname();

  // Admin and listen-together sessions render their own chrome — same
  // rule the desktop Navbar and MiniPlayer already follow.
  if (path.startsWith("/admin") || path.startsWith("/listen")) return null;

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <nav className="bottom-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 120,
      background: "var(--bg2)", borderTop: "1px solid var(--border2)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      // Keeps the bar clear of the iOS home indicator.
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      <div style={{
        height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-around", padding: "0 4px",
      }}>
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, textDecoration: "none", flex: 1, padding: "6px 0",
              color: active ? "var(--accent)" : "var(--text3)",
            }}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8}/>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
              <span style={{
                width: 4, height: 4, borderRadius: "50%", marginTop: -1,
                background: active ? "var(--accent)" : "transparent",
              }}/>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
