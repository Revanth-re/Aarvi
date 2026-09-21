"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareQuote } from "lucide-react";

/**
 * A floating shortcut to Messages, bottom-right — this is also where
 * the quotes/notes + music sharing (Instagram Notes-style) lives, so
 * the icon doubles as a quick entry point to that.
 */
export default function QuoteFab() {
  const pathname = usePathname();
  if (pathname?.startsWith("/messages")) return null;

  return (
    <Link href="/messages" aria-label="Messages & quotes" style={{
      position: "fixed", right: 16,
      bottom: "calc(var(--nav-float-gap) + var(--nav-h) + var(--player-nav-gap) + 14px + env(safe-area-inset-bottom, 0px))",
      width: 48, height: 48, borderRadius: "50%", background: "var(--grad)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "var(--shadow-lg)", zIndex: 115, textDecoration: "none",
    }}>
      <MessageSquareQuote size={21} color="#fff"/>
    </Link>
  );
}
