"use client";
import { useEffect, useState, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types";
import { Search, X, SlidersHorizontal } from "lucide-react";

const CATS = [
  { id: "all",         label: "All" },
  { id: "accessories", label: "Accessories" },
  { id: "clothing",    label: "Clothing" },
  { id: "handicrafts", label: "Handicrafts" },
  { id: "merchandise", label: "Merchandise" },
];

const SORTS = [
  { id: "default",    label: "Featured" },
  { id: "price-asc",  label: "Price: Low → High" },
  { id: "price-desc", label: "Price: High → Low" },
  { id: "rating",     label: "Top Rated" },
];

export default function ShopPage() {
  const [data, setData]       = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [cat, setCat]         = useState("all");
  const [sort, setSort]       = useState("default");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (cat !== "all") p.set("category", cat);
    if (search)        p.set("search", search);
    p.set("limit", "100");
    const r = await fetch(`/api/products?${p}`);
    const d = await r.json();
    if (Array.isArray(d)) setData(d);
    setLoading(false);
  }, [cat, search]);

  useEffect(() => {
    const t = setTimeout(load, 280);
    return () => clearTimeout(t);
  }, [load]);

  /* Client-side sort */
  const sorted = [...data].sort((a, b) => {
    if (sort === "price-asc")  return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "rating")     return (b.rating ?? 0) - (a.rating ?? 0);
    return 0;
  });

  const clearFilters = () => { setSearch(""); setCat("all"); setSort("default"); };
  const hasFilters   = search || cat !== "all" || sort !== "default";

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 4, letterSpacing: "-.02em" }}>
          Shop
        </h1>
        <p style={{ color: "var(--text3)", fontSize: 14 }}>
          Accessories, clothing, handicrafts & merchandise from your favourite stories
        </p>
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>

        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }} />
          <input
            className="inp"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, paddingRight: search ? 36 : 14 }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 2 }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <SlidersHorizontal size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }} />
          <select
            className="inp"
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ paddingLeft: 30, paddingRight: 14, width: "auto", minWidth: 160 }}
          >
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
        {CATS.map(c => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            style={{
              padding: "7px 16px", borderRadius: 99,
              border: `1px solid ${cat === c.id ? "var(--accent)" : "var(--border2)"}`,
              background: cat === c.id ? "var(--accent)" : "transparent",
              color: cat === c.id ? "#fff" : "var(--text3)",
              fontSize: 13, cursor: "pointer",
              fontWeight: cat === c.id ? 600 : 400,
              transition: "all .15s",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Count + clear */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          {loading ? "Loading…" : `${sorted.length} item${sorted.length !== 1 ? "s" : ""}`}
        </p>
        {hasFilters && !loading && (
          <button
            onClick={clearFilters}
            style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
          >
            <X size={11} /> Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid-products">
        {loading
          ? [...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: "1 / 1.4", borderRadius: 14 }} />
            ))
          : sorted.length === 0
          ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "80px 20px" }}>
              <p style={{ color: "var(--text3)", marginBottom: 16, fontSize: 15 }}>No products found.</p>
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )
          : sorted.map(p => <ProductCard key={p._id} product={p} />)
        }
      </div>
    </div>
  );
}
