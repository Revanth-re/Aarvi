"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart, useApp } from "@/store";
import { ShoppingBag, Radio, Menu, X, Shield } from "lucide-react";

const THEMES = [
  { id:"midnight", label:"Midnight", dot:"#7c6af7" },
  { id:"forest",   label:"Forest",   dot:"#22c55e" },
  { id:"desert",   label:"Desert",   dot:"#f59e0b" },
  { id:"ocean",    label:"Ocean",    dot:"#38bdf8" },
  { id:"rose",     label:"Rose",     dot:"#f43f5e" },
  { id:"mono",     label:"Light",    dot:"#1c1917" },
] as const;

export default function Navbar() {
  const path = usePathname();
  const items = useCart(s => s.items);
  const cartN = items.reduce((a, i) => a + i.quantity, 0);
  const { theme, setTheme } = useApp();
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const isAdmin = path.startsWith("/admin");
  if (isAdmin) return null;

  const links = [
    { href: "/", label: "Home" },
    { href: "/series", label: "Series" },
    { href: "/shop", label: "Shop" },
  ];

  const active = (href: string) => href === "/" ? path === "/" : path.startsWith(href);

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--bg2)", borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        <div className="container" style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Radio size={16} color="#fff" strokeWidth={2.5}/>
            </div>
            <span style={{ fontFamily: "var(--ff-sans)", fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px" }}>Aarvi</span>
          </Link>

          {/* Desktop links */}
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {links.map(l => (
              <Link key={l.href} href={l.href} style={{
                padding: "7px 14px", borderRadius: 8, textDecoration: "none",
                fontSize: 14, fontWeight: 500,
                color: active(l.href) ? "var(--accent)" : "var(--text2)",
                background: active(l.href) ? "var(--accent)12" : "transparent",
                transition: "all .15s",
              }}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Theme */}
            <div style={{ position: "relative" }}>
              <button className="btn-icon btn-ghost" onClick={() => setThemeOpen(!themeOpen)}
                style={{ display: "flex", background: themeOpen ? "var(--surface2)" : "transparent", border: "1px solid transparent", borderColor: themeOpen ? "var(--border2)" : "transparent", cursor: "pointer" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: THEMES.find(t=>t.id===theme)?.dot || "var(--accent)", border: "2px solid var(--border2)" }}/>
              </button>
              {themeOpen && (
                <div style={{ position: "absolute", right: 0, top: 44, background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 14, padding: "8px", width: 170, zIndex: 200, boxShadow: "var(--shadow-lg)" }}>
                  <p style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", padding: "4px 8px 8px" }}>Theme</p>
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => { setTheme(t.id as never); document.documentElement.setAttribute("data-theme", t.id); setThemeOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: theme === t.id ? "var(--surface2)" : "transparent", cursor: "pointer", color: theme === t.id ? "var(--text)" : "var(--text2)", fontSize: 13, fontWeight: theme === t.id ? 500 : 400 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: t.dot, flexShrink: 0 }}/>
                      {t.label}
                      {theme === t.id && <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: 12 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Admin */}
            <Link href="/admin" className="btn-icon btn-ghost hide-mobile" style={{ display: "flex", textDecoration: "none", border: "1px solid transparent" }}>
              <Shield size={17} color="var(--text3)"/>
            </Link>

            {/* Cart */}
            <Link href="/cart" style={{ position: "relative", display: "flex", padding: 8, borderRadius: 8, border: "1px solid transparent", textDecoration: "none" }}>
              <ShoppingBag size={18} color="var(--text2)"/>
              {cartN > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, width: 17, height: 17, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                  {cartN > 9 ? "9+" : cartN}
                </span>
              )}
            </Link>

            {/* Mobile menu */}
            <button onClick={() => setOpen(!open)} style={{ display: "none", padding: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text2)" }} className="show-mobile-flex">
              {open ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg2)", padding: "12px 16px 20px" }}>
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ display: "block", padding: "12px 8px", fontSize: 15, fontWeight: active(l.href) ? 600 : 400, color: active(l.href) ? "var(--accent)" : "var(--text2)", textDecoration: "none", borderBottom: "1px solid var(--border)" }}>
                {l.label}
              </Link>
            ))}
            <Link href="/admin" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px", fontSize: 15, color: "var(--text3)", textDecoration: "none", marginTop: 4 }}>
              <Shield size={16}/>Admin Panel
            </Link>
          </div>
        )}
      </nav>
      <style>{`
        @media(min-width:769px){.show-mobile-flex{display:none!important}}
        @media(max-width:768px){.show-mobile-flex{display:flex!important}}
      `}</style>
    </>
  );
}
