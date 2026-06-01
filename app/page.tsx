"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SeriesCard from "@/components/SeriesCard";
import ProductCard from "@/components/ProductCard";
import { Series, Product } from "@/types";
import { Headphones, TrendingUp, Sparkles, ArrowRight, Radio, Zap } from "lucide-react";

export default function Home() {
  const [featured, setFeatured] = useState<Series[]>([]);
  const [trending, setTrending] = useState<Series[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    const [f, t, p] = await Promise.all([
      fetch("/api/series?featured=true&limit=4").then(r => r.json()),
      fetch("/api/series?trending=true&limit=6").then(r => r.json()),
      fetch("/api/products?limit=4").then(r => r.json()),
    ]);
    if (Array.isArray(f)) setFeatured(f);
    if (Array.isArray(t)) setTrending(t);
    if (Array.isArray(p)) setProducts(p);
    setLoading(false);
  };

  const seed = async () => {
    setSeeding(true);
    const r = await fetch("/api/seed", { method: "POST" });
    const d = await r.json();
    setToast(d.ok ? `✓ Loaded ${d.series} series & ${d.products} products` : "Error seeding");
    setSeeding(false);
    setTimeout(() => setToast(""), 3500);
    load();
  };

  useEffect(() => { load(); }, []);

  const empty = !loading && featured.length === 0;

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{ position: "relative", overflow: "hidden", paddingTop: 80, paddingBottom: 80, borderBottom: "1px solid var(--border)" }}>
        {/* Ambient blobs */}
        <div style={{ position: "absolute", top: -120, right: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,var(--accent)18 0%,transparent 70%)", pointerEvents: "none" }}/>
        <div style={{ position: "absolute", bottom: -80, left: -60, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,var(--accent2)10 0%,transparent 70%)", pointerEvents: "none" }}/>

        <div className="container" style={{ position: "relative" }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 99, background: "var(--accent)15", border: "1px solid var(--accent)30", marginBottom: 24 }}>
              <Radio size={12} color="var(--accent)"/>
              <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>Audio Stories & FM Series</span>
            </div>

            <h1 style={{ fontSize: "clamp(2.2rem,5vw,4rem)", fontWeight: 700, color: "var(--text)", lineHeight: 1.1, marginBottom: 20, letterSpacing: "-.03em" }}>
              Stories that<br/>
              <span className="grad" style={{ fontFamily: "var(--ff-serif)", fontStyle: "italic", fontSize: "1.05em" }}>live in your ears.</span>
            </h1>

            <p style={{ fontSize: 16, color: "var(--text2)", maxWidth: 480, lineHeight: 1.7, marginBottom: 36 }}>
              Immersive audio series across thriller, romance, sci-fi & folklore — with word-by-word transcripts and exclusive merchandise.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/series" className="btn btn-primary" style={{ textDecoration: "none", padding: "12px 24px", fontSize: 15, boxShadow: "0 4px 20px var(--accent)40" }}>
                <Headphones size={17}/>Start Listening
              </Link>
              <Link href="/shop" className="btn btn-ghost" style={{ textDecoration: "none", padding: "12px 24px", fontSize: 15 }}>
                Visit Shop <ArrowRight size={15}/>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seed banner ── */}
      {empty && (
        <section style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "32px 20px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent)18", border: "1px solid var(--accent)30", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Zap size={24} color="var(--accent)"/>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Load demo content</h2>
          <p style={{ color: "var(--text3)", marginBottom: 20, fontSize: 14 }}>Populate the app with 6 audio series and 14 products to see everything in action.</p>
          <button className="btn btn-primary" onClick={seed} disabled={seeding} style={{ margin: "0 auto" }}>
            <Sparkles size={15}/>{seeding ? "Loading..." : "Load Demo Data"}
          </button>
        </section>
      )}

      {/* ── Featured ── */}
      {(loading || featured.length > 0) && (
        <section style={{ padding: "56px 0" }}>
          <div className="container">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={14} color="var(--accent)"/>
                </div>
                <h2 className="section-title" style={{ fontSize: 20 }}>Featured Series</h2>
              </div>
              <Link href="/series" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>View all<ArrowRight size={13}/></Link>
            </div>
            <div className="grid-cards">
              {loading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280 }}/>) : featured.map(s => <SeriesCard key={s._id} series={s}/>)}
            </div>
          </div>
        </section>
      )}

      {/* ── Trending ── */}
      {(loading || trending.length > 0) && (
        <section style={{ padding: "0 0 56px", borderBottom: "1px solid var(--border)" }}>
          <div className="container">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent2)18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={14} color="var(--accent2)"/>
                </div>
                <h2 className="section-title" style={{ fontSize: 20 }}>Trending Now</h2>
              </div>
              <Link href="/series" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>All series<ArrowRight size={13}/></Link>
            </div>
            <div className="grid-cards">
              {loading ? [...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 250 }}/>) : trending.map(s => <SeriesCard key={s._id} series={s}/>)}
            </div>
          </div>
        </section>
      )}

      {/* ── Genre chips ── */}
      <section style={{ padding: "40px 0", borderBottom: "1px solid var(--border)" }}>
        <div className="container">
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 16 }}>Browse by genre</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Thriller", "Sci-Fi", "Romance Drama", "Historical Adventure", "Folklore", "Cyber Thriller"].map(g => (
              <Link key={g} href={`/series?genre=${encodeURIComponent(g)}`} className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>{g}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shop preview ── */}
      {(loading || products.length > 0) && (
        <section style={{ padding: "56px 0" }}>
          <div className="container">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <h2 className="section-title" style={{ fontSize: 20 }}>From the Shop</h2>
              <Link href="/shop" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>See all<ArrowRight size={13}/></Link>
            </div>
            <div className="grid-products">
              {loading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 300 }}/>) : products.map(p => <ProductCard key={p._id} product={p}/>)}
            </div>
          </div>
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
