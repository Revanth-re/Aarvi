"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/store";
import { Radio, LayoutDashboard, Headphones, ShoppingBag, ExternalLink, Menu, X } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/series", label: "Audio Series", icon: Headphones },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const theme = useApp(s => s.theme);
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => exact ? path === href : path.startsWith(href);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div style={{ width: mobile ? "100%" : 230, background: "var(--surface)", borderRight: mobile ? "none" : "1px solid var(--border)", display: "flex", flexDirection: "column", height: mobile ? "auto" : "100vh", position: mobile ? "relative" : "sticky", top: 0 }}>
      {/* Logo */}
      <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Radio size={15} color="#fff" strokeWidth={2.5}/>
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px" }}>Naad</p>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".7px", padding: "8px 10px 6px" }}>Navigation</p>
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, marginBottom: 2, textDecoration: "none", background: active ? "var(--accent)18" : "transparent", color: active ? "var(--accent)" : "var(--text2)", fontWeight: active ? 600 : 400, fontSize: 14, transition: "all .15s" }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface2)"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 2}/>
              {label}
              {active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", marginLeft: "auto" }}/>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, color: "var(--text3)", textDecoration: "none", fontSize: 13, transition: "color .15s" }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color="var(--text)"}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color="var(--text3)"}>
          <ExternalLink size={14}/>View Site
        </Link>
      </div>
    </div>
  );

  return (
    <div data-theme={theme} style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Desktop sidebar */}
      <div className="hide-mobile"><Sidebar/></div>

      {/* Mobile header */}
      <div className="show-mobile-flex" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 16px", height: 56, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Radio size={14} color="#fff"/>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex" }}>
          {open ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="show-mobile-flex" style={{ display: "none", position: "fixed", top: 56, left: 0, right: 0, bottom: 0, background: "var(--bg)", zIndex: 99, overflow: "auto" }}>
          <Sidebar mobile/>
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", minHeight: "100vh", paddingTop: 0 }} className="admin-main">
        {children}
      </main>

      <style>{`
        @media(min-width:769px){.show-mobile-flex{display:none!important}}
        @media(max-width:768px){.show-mobile-flex{display:flex!important}.hide-mobile{display:none!important}.admin-main{padding-top:56px!important}}
      `}</style>
    </div>
  );
}
