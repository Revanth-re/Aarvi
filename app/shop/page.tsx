"use client";
import { useEffect, useState, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types";
import { Search, X } from "lucide-react";

const CATS = [
  { id:"all", label:"All Products" },
  { id:"accessories", label:"Accessories" },
  { id:"clothing", label:"Clothing" },
  { id:"handicrafts", label:"Handicrafts" },
  { id:"merchandise", label:"Merchandise" },
];

export default function ShopPage() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (cat !== "all") p.set("category", cat);
    if (search) p.set("search", search);
    const r = await fetch(`/api/products?${p}`);
    const d = await r.json();
    if (Array.isArray(d)) setData(d);
    setLoading(false);
  }, [cat, search]);

  useEffect(() => { const t = setTimeout(load, 280); return () => clearTimeout(t); }, [load]);

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 4, letterSpacing: "-.02em" }}>Shop</h1>
        <p style={{ color: "var(--text3)", fontSize: 14 }}>Accessories, clothing, handicrafts & merchandise from your favourite stories</p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 440, marginBottom: 20 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }}/>
        <input className="inp" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }}/>
        {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--text3)" }}><X size={14}/></button>}
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 32, flexWrap: "wrap" }}>
        {CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)} style={{ padding: "7px 16px", borderRadius: 99, border: `1px solid ${cat===c.id?"var(--accent)":"var(--border2)"}`, background: cat===c.id?"var(--accent)":"transparent", color: cat===c.id?"#fff":"var(--text3)", fontSize: 13, cursor: "pointer", fontWeight: cat===c.id?600:400, transition: "all .15s" }}>
            {c.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>{loading ? "Loading..." : `${data.length} item${data.length !== 1 ? "s" : ""}`}</p>

      <div className="grid-products">
        {loading ? [...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 300 }}/>) :
         data.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: "var(--text3)" }}>No products found.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setCat("all"); }} style={{ marginTop: 12 }}>Clear filters</button>
          </div>
         ) : data.map(p => <ProductCard key={p._id} product={p}/>)}
      </div>
    </div>
  );
}
