"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Product } from "@/types";
import { Plus, Edit2, Trash2, Star, Search, X } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

const CATS = ["all", "accessories", "clothing", "handicrafts", "merchandise"];

export default function AdminProducts() {
  const [data, setData]         = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cat, setCat]           = useState("all");
  const [search, setSearch]     = useState("");

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (cat !== "all") p.set("category", cat);
    fetch(`/api/products?${p}&limit=100`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); setLoading(false); });
  };
  useEffect(() => { load(); }, [cat]);

  const filtered = data.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    await adminFetch(`/api/products/${id}`, { method: "DELETE" });
    setData(d => d.filter(x => x._id !== id));
    setDeleting(null);
  };

  return (
    <div style={{ padding: "clamp(14px, 3vw, 28px)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px, 3vw, 22px)", fontWeight: 700, color: "var(--text)", marginBottom: 2, letterSpacing: "-.02em" }}>
            Products
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 12 }}>{data.length} products in shop</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>
          <Plus size={14} />New Product
        </Link>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }} />
        <input
          className="inp" placeholder="Search products…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 32, paddingRight: search ? 32 : 12, height: 38, fontSize: 13 }}
        />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 2 }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Category pills — horizontally scrollable on mobile */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding: "6px 12px", borderRadius: 99, border: `1px solid ${cat === c ? "var(--accent)" : "var(--border2)"}`,
            background: cat === c ? "var(--accent)" : "transparent",
            color: cat === c ? "#fff" : "var(--text3)",
            fontSize: 12, cursor: "pointer", textTransform: "capitalize",
            fontWeight: cat === c ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0,
            transition: "all .15s",
          }}>{c}</button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text3)", fontSize: 14, marginBottom: 16 }}>
            {data.length === 0 ? "No products yet." : "No results found."}
          </p>
          {data.length === 0 && (
            <Link href="/admin/products/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
              <Plus size={13} />Add First Product
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Mobile card list (< 640px) ── */}
          <div className="products-mobile-list">
            {filtered.map(p => (
              <div key={p._id} className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                {p.images?.[0]
                  ? <img src={p.images[0]} alt="" style={{ width: 44, height: 44, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 44, height: 44, borderRadius: 9, background: "var(--surface2)", flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="badge badge-muted" style={{ textTransform: "capitalize", fontSize: 10 }}>{p.category}</span>
                    <span style={{ fontFamily: "var(--ff-mono)", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>₹{p.price.toLocaleString("en-IN")}</span>
                    <span style={{ fontSize: 11, color: p.stock <= 5 ? "var(--danger)" : "var(--text3)" }}>Stock: {p.stock}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Link href={`/admin/products/${p._id}`} className="btn btn-ghost btn-xs" style={{ textDecoration: "none" }}><Edit2 size={12} /></Link>
                  <button className="btn btn-danger btn-xs" onClick={() => del(p._id, p.name)} disabled={deleting === p._id}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (≥ 640px) ── */}
          <div className="card products-desktop-table" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Rating</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{p.name}</p>
                            <p style={{ fontSize: 11, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{p.description}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-muted" style={{ textTransform: "capitalize" }}>{p.category}</span></td>
                      <td><span style={{ fontFamily: "var(--ff-mono)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>₹{p.price.toLocaleString("en-IN")}</span></td>
                      <td><span style={{ fontFamily: "var(--ff-mono)", fontSize: 13, color: p.stock > 10 ? "var(--text3)" : "var(--danger)" }}>{p.stock}</span></td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13 }}>
                          <Star size={11} color="#f59e0b" fill="#f59e0b" />{p.rating}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Link href={`/admin/products/${p._id}`} className="btn btn-ghost btn-xs" style={{ textDecoration: "none" }}><Edit2 size={12} />Edit</Link>
                          <button className="btn btn-danger btn-xs" onClick={() => del(p._id, p.name)} disabled={deleting === p._id}>
                            <Trash2 size={12} />{deleting === p._id ? "…" : "Del"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 639px) {
          .products-mobile-list  { display: block !important; }
          .products-desktop-table { display: none !important; }
        }
        @media (min-width: 640px) {
          .products-mobile-list  { display: none !important; }
          .products-desktop-table { display: block !important; }
        }
      `}</style>
    </div>
  );
}
