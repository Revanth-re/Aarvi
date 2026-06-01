"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Product } from "@/types";
import { useCart } from "@/store";
import { Star, ShoppingCart, ArrowLeft, Check, Package, ShieldCheck, Truck, Share2, Zap, Heart } from "lucide-react";
import Link from "next/link";

export default function ProductDetailClient() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState("M");
  const [isFavorite, setIsFavorite] = useState(false);
  
  const { add } = useCart();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    add(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    add(product, 1);
    router.push("/cart");
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      });
    } else {
      alert("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="skeleton rounded-3xl aspect-square" />
          <div className="space-y-6">
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-6 w-1/4" />
            <div className="skeleton h-48 w-full" />
            <div className="skeleton h-14 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 px-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <Package size={40} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <p className="text-muted mb-8">This item might have been removed or the link is broken.</p>
        <Link href="/shop" className="btn btn-primary">
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold transition-all hover:translate-x-[-4px]"
          style={{ color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={18} />
          Back to Collection
        </button>
        <div className="flex gap-2">
          <button 
            onClick={share}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-border text-muted hover:text-accent transition-colors"
            title="Share"
          >
            <Share2 size={18} />
          </button>
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface border border-border transition-colors"
            style={{ color: isFavorite ? "#fb7185" : "var(--color-text-muted)" }}
            title="Add to wishlist"
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Images Galley */}
        <div className="space-y-6">
          <div 
            className="aspect-square rounded-[2rem] overflow-hidden group cursor-zoom-in" 
            style={{ 
              background: "var(--color-surface)", 
              border: "1px solid var(--color-border)",
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.3)"
            }}
          >
            {product.images?.[activeImg] ? (
              <img 
                src={product.images[activeImg]} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCart size={48} style={{ color: "var(--color-border)" }} />
              </div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scroll">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 transition-all transform active:scale-90"
                  style={{ 
                    border: `3px solid ${activeImg === i ? "var(--color-accent)" : "transparent"}`,
                    opacity: activeImg === i ? 1 : 0.5,
                    background: "var(--color-surface)",
                    boxShadow: activeImg === i ? "0 10px 20px rgba(0,0,0,0.1)" : "none"
                  }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
             <span 
              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "var(--color-accent)22", color: "var(--color-accent)", border: "1px solid var(--color-accent)44" }}
            >
              {product.category}
            </span>
            {product.stock > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                In Stock
              </span>
            )}
          </div>
          
          <h1 
            className="mb-4"
            style={{ 
              fontFamily: "var(--font-display)", 
              fontSize: "clamp(2.5rem, 5vw, 4rem)", 
              fontWeight: 800, 
              color: "var(--color-text)", 
              lineHeight: 1,
              letterSpacing: "-0.02em"
            }}
          >
            {product.name}
          </h1>

          <div className="flex items-center gap-6 mb-8">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    style={{ color: i < Math.round(product.rating) ? "#f59e0b" : "var(--color-border)" }}
                    fill={i < Math.round(product.rating) ? "#f59e0b" : "none"}
                  />
                ))}
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{product.rating}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-border" />
            <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{product.reviews} Reviews</span>
          </div>

          <div className="mb-10 flex items-baseline gap-4">
            <span 
              style={{ 
                fontSize: "3rem", 
                fontWeight: 800, 
                color: "var(--color-text)", 
                fontFamily: "var(--font-mono)",
                letterSpacing: "-0.04em"
              }}
            >
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            <span className="text-lg opacity-40 line-through" style={{ fontFamily: "var(--font-mono)" }}>
              ₹{(product.price * 1.25).toLocaleString("en-IN")}
            </span>
          </div>

          {/* Configuration */}
          {product.category === "clothing" && (
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-widest mb-4 opacity-70">Select Size</p>
              <div className="flex gap-3">
                {["S", "M", "L", "XL", "2XL"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className="w-12 h-12 rounded-xl text-sm font-bold transition-all border-2"
                    style={{
                      background: selectedSize === s ? "var(--color-accent)" : "transparent",
                      borderColor: selectedSize === s ? "var(--color-accent)" : "var(--color-border)",
                      color: selectedSize === s ? "#fff" : "var(--color-text)"
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div 
            className="p-6 rounded-[1.5rem] mb-10" 
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-base" style={{ color: "var(--color-text2)", lineHeight: 1.8 }}>
              {product.description}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
             <button
              onClick={handleBuyNow}
              className="flex-1 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ 
                background: "var(--color-text)", 
                color: "var(--color-bg)",
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)"
              }}
            >
              <Zap size={20} fill="currentColor" />
              Buy Now
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ 
                background: added ? "#34d399" : "var(--color-accent)", 
                color: "#fff",
                boxShadow: `0 20px 40px -10px ${added ? "#34d39966" : "var(--color-accent)66"}`
              }}
            >
              {added ? (
                <><Check size={20} /> Packaged</>
              ) : (
                <><ShoppingCart size={20} /> Add to Cart</>
              )}
            </button>
          </div>

          {/* Perks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-8 rounded-3xl" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-2)44" }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-500 shrink-0">
                <Truck size={22} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Express Shipping</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>Get it delivered in 2-4 business days across India.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-green-500/10 text-green-500 shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Quality Gaurantee</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>100% authentic handcrafted products from local artisans.</p>
              </div>
            </div>
          </div>

          {product.relatedSeries && (
            <div className="mt-12 p-6 rounded-3xl border-2 border-dashed border-border text-center">
              <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Official Merchandise For</p>
              <h4 className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>{product.relatedSeries}</h4>
              <p className="text-xs text-muted mt-2">Listen to the series while you wait for your order!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
