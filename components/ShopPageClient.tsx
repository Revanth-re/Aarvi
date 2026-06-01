"use client";

import { useEffect, useState, useCallback } from "react";
import { Product } from "@/types";
import ProductCard from "@/components/ProductCard";
import { Search, X, Bell, ShoppingBag, Sparkles, Store } from "lucide-react";

const CATEGORIES = [
  "all",
  "custom t-shirts",
  "oversized t-shirts",
  "handloom sarees",
  "block print kurtas",
  "brass & copper crafts",
  "wooden handicrafts",
  "pottery & ceramics",
  "DIY kits",
  "accessories",
];

export default function ShopPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const t = setTimeout(fetch_, 300);
    return () => clearTimeout(t);
  }, [fetch_]);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (notifyEmail.trim()) {
      setNotifySubmitted(true);
      setTimeout(() => setNotifySubmitted(false), 5000);
      setNotifyEmail("");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", fontSize: "2.2rem" }}
        >
          The Shop
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Custom series t-shirts, Indian handicrafts, DIY kits &amp; more — inspired by your favourite Telugu audio stories
        </p>
      </div>

      {/* ─── COMING SOON HERO BANNER ─── */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 20,
          background: "linear-gradient(135deg, var(--surface, #141420) 0%, var(--surface2, #1c1c2e) 50%, var(--surface, #141420) 100%)",
          border: "1px solid var(--border2, #ffffff18)",
          padding: "40px 28px",
          marginBottom: 36,
        }}
      >
        {/* Decorative blurred glows */}
        <div style={{
          position: "absolute", top: -60, right: -60, width: 200, height: 200,
          borderRadius: "50%", background: "var(--accent, #7c6af7)",
          opacity: 0.1, filter: "blur(60px)", pointerEvents: "none",
        }}/>
        <div style={{
          position: "absolute", bottom: -40, left: -40, width: 160, height: 160,
          borderRadius: "50%", background: "var(--accent2, #f06292)",
          opacity: 0.08, filter: "blur(50px)", pointerEvents: "none",
        }}/>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 14px", borderRadius: 99,
            background: "var(--accent, #7c6af7)", color: "#fff",
            fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5,
            marginBottom: 14,
          }}>
            <Sparkles size={12}/>
            Coming Soon
          </div>

          <h2 style={{
            fontSize: 24, fontWeight: 700, color: "var(--text, #f0f0f8)",
            marginBottom: 8, lineHeight: 1.3,
          }}>
            Shop isn&apos;t open yet — but it&apos;s worth the wait!
          </h2>
          <p style={{
            fontSize: 14, color: "var(--text2, #a0a0c0)",
            marginBottom: 6, maxWidth: 560, lineHeight: 1.7,
          }}>
            We&apos;re curating <strong style={{ color: "var(--text, #f0f0f8)" }}>custom t-shirts</strong> from your 
            favourite Telugu audio series, <strong style={{ color: "var(--text, #f0f0f8)" }}>Indian handicrafts</strong> 
            — handloom sarees, block-printed kurtas, brass &amp; copper work, wooden crafts, pottery 
            — and fun <strong style={{ color: "var(--text, #f0f0f8)" }}>DIY kits</strong>.
          </p>
          <p style={{
            fontSize: 13, color: "var(--text3, #60607a)",
            marginBottom: 22, maxWidth: 480,
          }}>
            Drop your email below and we&apos;ll notify you when the shop goes live 🚀
          </p>

          {/* Notify Me form */}
          {!notifySubmitted ? (
            <form onSubmit={handleNotify} style={{ display: "flex", gap: 8, maxWidth: 420, flexWrap: "wrap" }}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                style={{
                  flex: 1, minWidth: 200, padding: "11px 16px",
                  borderRadius: 10, border: "1px solid var(--border2, #ffffff18)",
                  background: "var(--bg, #09090f)", color: "var(--text, #f0f0f8)",
                  fontSize: 14, outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "11px 24px", borderRadius: 10,
                  background: "linear-gradient(135deg, var(--accent, #7c6af7), var(--accent2, #f06292))",
                  color: "#fff", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                  transition: "transform .15s, box-shadow .15s",
                }}
              >
                <Bell size={14}/>
                Notify Me
              </button>
            </form>
          ) : (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "11px 22px", borderRadius: 10,
              background: "#34d39918",
              border: "1px solid #34d39944",
              color: "#34d399", fontSize: 14, fontWeight: 600,
            }}>
              <Bell size={14}/>
              You&apos;re on the list! We&apos;ll notify you when the shop opens.
            </div>
          )}
        </div>
      </div>

      {/* ─── CATEGORY PREVIEW (what we'll sell) ─── */}
      <div style={{ marginBottom: 36 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text, #f0f0f8)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Store size={16} style={{ color: "var(--accent, #7c6af7)" }}/>
          What we&apos;ll have
        </h3>
        <div className="scroll-x no-scroll" style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
          {CATEGORIES.filter(c => c !== "all").map((cat) => (
            <div
              key={cat}
              style={{
                padding: "8px 18px",
                borderRadius: 99,
                fontSize: 13,
                textTransform: "capitalize",
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: "var(--surface2, #1c1c2e)",
                color: "var(--text2, #a0a0c0)",
                border: "1px solid var(--border, #ffffff0f)",
              }}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* ─── PRODUCT PREVIEW SECTION ─── */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text, #f0f0f8)", marginBottom: 4 }}>
          Sneak Peek
        </h3>
        <p className="text-xs" style={{ color: "var(--color-text-muted)", marginBottom: 16 }}>
          {loading ? "Loading previews..." : `${products.length} product${products.length !== 1 ? "s" : ""} Preview — not available for purchase yet`}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-lg">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
            <X size={14} style={{ color: "var(--color-text-muted)" }} />
          </button>
        )}
      </div>

      {/* Category filter pills */}
      <div className="scroll-x no-scroll" style={{ display: "flex", gap: 8, marginBottom: 28, paddingBottom: 4 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="transition-all"
            style={{
              padding: "7px 18px",
              borderRadius: 99,
              fontSize: 13,
              textTransform: "capitalize",
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: category === cat ? "var(--accent, #7c6af7)" : "var(--surface, #141420)",
              color: category === cat ? "#fff" : "var(--text2, #a0a0c0)",
              border: `1px solid ${category === cat ? "var(--accent, #7c6af7)" : "var(--border2, #ffffff18)"}`,
              fontWeight: category === cat ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-72" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px", opacity: 0.4 }}/>
          <p style={{ color: "var(--color-text-muted)", marginBottom: 4 }}>No products found in this category yet.</p>
          <p className="text-xs" style={{ color: "var(--text3, #60607a)" }}>Products will appear here once the shop launches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
  );
}
