"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, ShoppingBag, TrendingUp, BookOpen, Plus, Database, ArrowRight, Zap } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

export default function AdminDashboard() {
  const [stats, setStats]     = useState({ series: 0, products: 0, episodes: 0, plays: 0 });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast]     = useState("");

  const load = async () => {
    const [s, p] = await Promise.all([
      fetch("/api/series?limit=100").then(r => r.json()),
      fetch("/api/products?limit=100").then(r => r.json()),
    ]);
    if (Array.isArray(s) && Array.isArray(p)) {
      setStats({
        series:   s.length,
        products: p.length,
        episodes: s.reduce((a: number, x: { totalEpisodes: number }) => a + (x.totalEpisodes || 0), 0),
        plays:    s.reduce((a: number, x: { totalPlays: number }) => a + (x.totalPlays || 0), 0),
      });
    }
    setLoading(false);
  };

  const seed = async () => {
    setSeeding(true);
    const r = await adminFetch("/api/seed", { method: "POST" });
    const d = await r.json();
    setToast(d.ok ? `✓ Seeded ${d.series} series + ${d.products} products` : "Error: " + d.error);
    setSeeding(false);
    setTimeout(() => setToast(""), 4000);
    load();
  };

  useEffect(() => { load(); }, []);

  const statCards = [
    { label: "Series",       value: stats.series,                                                              icon: Headphones, color: "var(--accent)" },
    { label: "Products",     value: stats.products,                                                            icon: ShoppingBag, color: "var(--accent2)" },
    { label: "Episodes",     value: stats.episodes,                                                            icon: BookOpen,    color: "var(--warning)" },
    { label: "Total Plays",  value: stats.plays >= 1000 ? `${(stats.plays / 1000).toFixed(0)}K` : stats.plays, icon: TrendingUp,  color: "var(--success)" },
  ];

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 700, color: "var(--text)", marginBottom: 3, letterSpacing: "-.02em" }}>
            Dashboard
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 13 }}>Welcome back. Here&apos;s what&apos;s happening on Aarvi.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={seed} disabled={seeding} style={{ flexShrink: 0 }}>
          <Database size={13} />{seeding ? "Seeding…" : "Seed Demo Data"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ background: "var(--success)15", border: "1px solid var(--success)30", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "var(--success)", display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={14} />{toast}
        </div>
      )}

      {/* Stat cards — 2×2 on mobile, 4 across on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 32 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 16px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</p>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} color={color} strokeWidth={2} />
              </div>
            </div>
            {loading
              ? <div className="skeleton" style={{ height: 28, width: 60 }} />
              : <p style={{ fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 700, color: "var(--text)", fontFamily: "var(--ff-mono)", lineHeight: 1 }}>{value}</p>
            }
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12, letterSpacing: "-.01em" }}>Quick Actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>

        {/* Series */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent)15", border: "1px solid var(--accent)20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Headphones size={18} color="var(--accent)" strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 1 }}>Audio Series</h3>
              <p style={{ fontSize: 12, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {stats.series} series · {stats.episodes} eps
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/series/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}>
              <Plus size={12} />New Series
            </Link>
            <Link href="/admin/series" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>
              Manage<ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Products */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--accent2)15", border: "1px solid var(--accent2)20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ShoppingBag size={18} color="var(--accent2)" strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 1 }}>Products</h3>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>{stats.products} items in shop</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/products/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}>
              <Plus size={12} />New Product
            </Link>
            <Link href="/admin/products" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>
              Manage<ArrowRight size={12} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
