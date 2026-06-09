"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, ShoppingCart, Zap, Check, Truck, ShieldCheck, RefreshCw, Package } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/store";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

export default function ProductDetailClient() {
  const { id }  = useParams() as { id: string };
  const router  = useRouter();
  const { add } = useCart();

  const [product,    setProduct]    = useState<Product | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [activeImg,  setActiveImg]  = useState(0);
  const [size,       setSize]       = useState("");
  const [qty,        setQty]        = useState(1);
  const [addedCart,  setAddedCart]  = useState(false);
  const [addedBuy,   setAddedBuy]   = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setProduct(d); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  const handleCart = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) add(product);
    setAddedCart(true);
    setTimeout(() => setAddedCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) add(product);
    setAddedBuy(true);
    setTimeout(() => { setAddedBuy(false); router.push("/cart"); }, 600);
  };

  if (loading) return (
    <div style={{ padding: "clamp(16px,4vw,40px) clamp(14px,4vw,20px)" }}>
      <div className="pd-grid">
        <div className="skeleton" style={{ aspectRatio: "1", borderRadius: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="skeleton" style={{ height: 32, width: "70%", borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 20, width: "40%", borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 100, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );

  if (notFound || !product) return (
    <div style={{ maxWidth: 440, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <Package size={40} color="var(--text3)" style={{ margin: "0 auto 16px" }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Product not found</h2>
      <p style={{ color: "var(--text3)", marginBottom: 24, fontSize: 14 }}>This product may have been removed.</p>
      <Link href="/shop" className="btn btn-primary" style={{ textDecoration: "none" }}>Back to Shop</Link>
    </div>
  );

  const p           = product;
  const hasDiscount = p.originalPrice && p.originalPrice > p.price;
  const discountPct = hasDiscount ? Math.round((1 - p.price / p.originalPrice!) * 100) : 0;
  const isClothing  = p.category === "clothing";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(14px,3vw,32px) clamp(14px,4vw,20px) 60px" }}>

      {/* Back button */}
      <button onClick={() => router.back()}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* ── Two-column grid — stacks on mobile ── */}
      <div className="pd-grid">

        {/* LEFT — Image */}
        <div>
          <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--surface2)", border: "1px solid var(--border)", aspectRatio: "1 / 1", position: "relative", marginBottom: 10 }}>
            {p.images?.[activeImg] ? (
              <img src={p.images[activeImg]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Package size={48} color="var(--text3)" />
              </div>
            )}
            {hasDiscount && (
              <div style={{ position: "absolute", top: 12, right: 12, background: "var(--danger)", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                -{discountPct}%
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {p.images && p.images.length > 1 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {p.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", border: `2px solid ${i === activeImg ? "var(--accent)" : "var(--border)"}`, padding: 0, cursor: "pointer", background: "var(--surface2)", transition: "border-color .15s", flexShrink: 0 }}>
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Info */}
        <div>
          {/* Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            <span className="badge badge-muted" style={{ textTransform: "capitalize" }}>{p.category}</span>
            {p.isFeatured && <span className="badge badge-accent">Featured</span>}
            {p.stock === 0 && <span className="badge badge-danger">Out of stock</span>}
            {p.stock > 0 && p.stock <= 5 && <span className="badge badge-danger">Only {p.stock} left</span>}
          </div>

          {/* Name */}
          <h1 style={{ fontSize: "clamp(20px,4vw,26px)", fontWeight: 700, color: "var(--text)", marginBottom: 10, lineHeight: 1.2, letterSpacing: "-.02em" }}>
            {p.name}
          </h1>

          {/* Rating */}
          {p.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={13} color="#f59e0b" fill={n <= Math.round(p.rating) ? "#f59e0b" : "transparent"} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--ff-mono)" }}>{p.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: "clamp(24px,5vw,32px)", fontWeight: 800, color: "var(--text)", fontFamily: "var(--ff-mono)", letterSpacing: "-.03em" }}>
              ₹{p.price.toLocaleString("en-IN")}
            </span>
            {hasDiscount && (
              <span style={{ fontSize: 15, color: "var(--text3)", fontFamily: "var(--ff-mono)", textDecoration: "line-through" }}>
                ₹{p.originalPrice!.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          {/* Description */}
          {p.description && (
            <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, marginBottom: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              {p.description}
            </p>
          )}

          {/* Size — only for clothing */}
          {isClothing && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>
                Select Size {size && <span style={{ color: "var(--accent)", textTransform: "none", letterSpacing: 0 }}>— {size}</span>}
              </p>
              {/* Single row of size buttons, scrollable on tiny screens */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => setSize(s === size ? "" : s)}
                    style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${s === size ? "var(--accent)" : "var(--border2)"}`, background: s === size ? "var(--accent)15" : "transparent", color: s === size ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: s === size ? 700 : 500, cursor: "pointer", transition: "all .15s", flexShrink: 0 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 10 }}>
              Quantity
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border2)", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 44, height: 44, border: "none", background: "none", cursor: "pointer", color: "var(--text2)", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                −
              </button>
              <span style={{ width: 48, textAlign: "center", fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "var(--ff-mono)" }}>
                {qty}
              </span>
              <button onClick={() => setQty(q => Math.min(p.stock || 99, q + 1))}
                style={{ width: 44, height: 44, border: "none", background: "none", cursor: "pointer", color: "var(--text2)", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                +
              </button>
            </div>
          </div>

          {/* CTA Buttons — full width, stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <button onClick={handleBuyNow} disabled={p.stock === 0}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", background: addedBuy ? "var(--success)" : "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: p.stock === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: p.stock === 0 ? .5 : 1, transition: "background .2s" }}>
              {addedBuy ? <Check size={16} /> : <Zap size={16} />}
              {addedBuy ? "Added! Going to cart…" : p.stock === 0 ? "Out of Stock" : "Buy Now"}
            </button>
            <button onClick={handleCart} disabled={p.stock === 0}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "1.5px solid var(--border2)", background: addedCart ? "var(--success)15" : "var(--surface2)", color: addedCart ? "var(--success)" : "var(--text)", fontSize: 15, fontWeight: 600, cursor: p.stock === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: p.stock === 0 ? .5 : 1, transition: "all .2s" }}>
              {addedCart ? <Check size={16} /> : <ShoppingCart size={16} />}
              {addedCart ? "Added to cart!" : "Add to Cart"}
            </button>
          </div>

          {/* Trust badges — 2 col always, smaller on mobile */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { icon: Truck,       title: "Express Shipping",  desc: "2–4 days across India" },
              { icon: ShieldCheck, title: "Quality Guarantee", desc: "100% authentic products" },
              { icon: RefreshCw,   title: "Easy Returns",      desc: "7-day return policy" },
              { icon: Package,     title: "Safe Packaging",    desc: "Delivered safely" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: "flex", gap: 8, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent)12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <Icon size={13} color="var(--accent)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", margin: 0, marginBottom: 2, lineHeight: 1.3 }}>{title}</p>
                  <p style={{ fontSize: 10, color: "var(--text3)", margin: 0, lineHeight: 1.4 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          {p.tags && p.tags.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {p.tags.map(t => (
                <span key={t} style={{ fontSize: 11, color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 99, padding: "3px 10px" }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Responsive styles ── */}
      <style>{`
        /* Desktop: side by side */
        .pd-grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) minmax(0,1fr);
          gap: 40px;
          align-items: start;
        }

        /* Tablet: tighter gap */
        @media (max-width: 1024px) and (min-width: 641px) {
          .pd-grid { gap: 24px; }
        }

        /* Mobile: full single column — image on top, info below */
        @media (max-width: 640px) {
          .pd-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
