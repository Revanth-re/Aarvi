"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, ShoppingBag, TrendingUp, BookOpen, Plus, Database, ArrowRight, Zap } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ series:0, products:0, episodes:0, plays:0 });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    const [s, p] = await Promise.all([
      fetch("/api/series?limit=100").then(r => r.json()),
      fetch("/api/products?limit=100").then(r => r.json()),
    ]);
    if (Array.isArray(s) && Array.isArray(p)) {
      setStats({ series:s.length, products:p.length, episodes:s.reduce((a:number,x:{totalEpisodes:number})=>a+(x.totalEpisodes||0),0), plays:s.reduce((a:number,x:{totalPlays:number})=>a+(x.totalPlays||0),0) });
    }
    setLoading(false);
  };

  const seed = async () => {
    setSeeding(true);
    const r = await fetch("/api/seed", { method: "POST" });
    const d = await r.json();
    setToast(d.ok ? `✓ Seeded ${d.series} series + ${d.products} products` : "Error: " + d.error);
    setSeeding(false);
    setTimeout(() => setToast(""), 4000);
    load();
  };

  useEffect(() => { load(); }, []);

  const statCards = [
    { label: "Audio Series", value: stats.series, icon: Headphones, color: "var(--accent)" },
    { label: "Products", value: stats.products, icon: ShoppingBag, color: "var(--accent2)" },
    { label: "Episodes", value: stats.episodes, icon: BookOpen, color: "var(--warning)" },
    { label: "Total Plays", value: stats.plays >= 1000 ? `${(stats.plays/1000).toFixed(0)}K` : stats.plays, icon: TrendingUp, color: "var(--success)" },
  ];

  return (
    <div style={{ padding: "32px 28px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", marginBottom: 4, letterSpacing: "-.02em" }}>Dashboard</h1>
          <p style={{ color: "var(--text3)", fontSize: 14 }}>Welcome back. Here's what's happening on Naad.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={seed} disabled={seeding}>
          <Database size={14}/>{seeding ? "Seeding..." : "Seed Demo Data"}
        </button>
      </div>

      {toast && (
        <div style={{ background: "var(--success)15", border: "1px solid var(--success)30", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "var(--success)", display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={14}/>{toast}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 36 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</p>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={17} color={color} strokeWidth={2}/>
              </div>
            </div>
            {loading ? <div className="skeleton" style={{ height: 32, width: 80 }}/> :
             <p style={{ fontSize: 30, fontWeight: 700, color: "var(--text)", fontFamily: "var(--ff-mono)", lineHeight: 1 }}>{value}</p>}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 14, letterSpacing: "-.01em" }}>Quick Actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {/* Series card */}
        <div className="card" style={{ padding: "22px 22px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)15", border: "1px solid var(--accent)20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Headphones size={20} color="var(--accent)" strokeWidth={2}/>
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Audio Series</h3>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>{stats.series} series · {stats.episodes} episodes</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/series/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}>
              <Plus size={13}/>New Series
            </Link>
            <Link href="/admin/series" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
              Manage<ArrowRight size={13}/>
            </Link>
          </div>
        </div>

        {/* Products card */}
        <div className="card" style={{ padding: "22px 22px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent2)15", border: "1px solid var(--accent2)20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingBag size={20} color="var(--accent2)" strokeWidth={2}/>
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Products</h3>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>{stats.products} items in shop</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/products/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}>
              <Plus size={13}/>New Product
            </Link>
            <Link href="/admin/products" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
              Manage<ArrowRight size={13}/>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
