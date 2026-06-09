"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useApp } from "@/store";
import { Radio, LayoutDashboard, Headphones, ShoppingBag, ExternalLink, Menu, X, ChevronRight } from "lucide-react";

const NAV = [
  { href: "/admin",         label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { href: "/admin/series",  label: "Audio Series", icon: Headphones },
  { href: "/admin/products",label: "Products",     icon: ShoppingBag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path  = usePathname();
  const theme = useApp(s => s.theme);
  const [open, setOpen]     = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [path]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path.startsWith(href);

  const NavLinks = () => (
    <>
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href} href={href}
            onClick={() => setOpen(false)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, marginBottom: 2,
              textDecoration: "none",
              background: active ? "var(--accent)18" : "transparent",
              color: active ? "var(--accent)" : "var(--text2)",
              fontWeight: active ? 600 : 400, fontSize: 14,
              transition: "all .15s",
            }}
          >
            <Icon size={17} strokeWidth={active ? 2.5 : 2} />
            <span style={{ flex: 1 }}>{label}</span>
            {active && <ChevronRight size={13} />}
          </Link>
        );
      })}
    </>
  );

  if (!mounted) return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {children}
    </div>
  );

  return (
    <div data-theme={theme} style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Desktop & Tablet Sidebar (≥769px) ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "var(--surface)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        overflow: "hidden",
      }} className="admin-sidebar">
        {/* Logo */}
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Radio size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px" }}>Aarvi</p>
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".7px", padding: "6px 8px 8px" }}>Menu</p>
          <NavLinks />
        </nav>

        {/* Footer */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid var(--border)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, color: "var(--text3)", textDecoration: "none", fontSize: 13, transition: "color .15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <ExternalLink size={14} /> View Site
          </Link>
        </div>
      </aside>

      {/* ── Mobile Top Bar (≤768px) ── */}
      <div className="admin-topbar" style={{ display: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Radio size={13} color="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Admin</span>
        </div>

        {/* Current page breadcrumb */}
        <span style={{ fontSize: 12, color: "var(--text3)", flex: 1, marginLeft: 8 }}>
          {NAV.find(n => isActive(n.href, n.exact))?.label ?? ""}
        </span>

        <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 6, borderRadius: 8 }}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile Drawer Overlay ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 149, backdropFilter: "blur(2px)" }}
          className="admin-overlay"
        />
      )}

      {/* ── Mobile Drawer Panel ── */}
      <div className="admin-drawer" style={{
        transform: open ? "translateX(0)" : "translateX(-100%)",
      }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Radio size={14} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Aarvi</p>
              <p style={{ fontSize: 10, color: "var(--text3)" }}>Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 6 }}>
            <X size={18} />
          </button>
        </div>
        <nav style={{ padding: "10px 8px", flex: 1 }}>
          <NavLinks />
        </nav>
        <div style={{ padding: "10px 8px", borderTop: "1px solid var(--border)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>
            <ExternalLink size={14} /> View Site
          </Link>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, minWidth: 0, minHeight: "100vh", overflow: "auto" }} className="admin-main">
        {children}
      </main>

      <style>{`
        /* Desktop: sidebar visible, no topbar */
        @media (min-width: 769px) {
          .admin-sidebar  { display: flex !important; }
          .admin-topbar   { display: none !important; }
          .admin-drawer   { display: none !important; }
          .admin-overlay  { display: none !important; }
          .admin-main     { padding-top: 0 !important; }
        }

        /* Mobile: hide sidebar, show topbar + drawer */
        @media (max-width: 768px) {
          .admin-sidebar { display: none !important; }
          .admin-topbar {
            display: flex !important;
            align-items: center;
            position: fixed; top: 0; left: 0; right: 0; z-index: 150;
            height: 52px; padding: 0 14px;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
          }
          .admin-main { padding-top: 52px !important; }
          .admin-drawer {
            display: flex !important;
            flex-direction: column;
            position: fixed; top: 0; left: 0; bottom: 0;
            width: min(280px, 80vw);
            background: var(--surface);
            border-right: 1px solid var(--border);
            z-index: 200;
            transition: transform .25s cubic-bezier(.4,0,.2,1);
          }
        }

        /* Tablet tweaks */
        @media (min-width: 769px) and (max-width: 1024px) {
          .admin-sidebar { width: 200px !important; }
        }
      `}</style>
    </div>
  );
}
