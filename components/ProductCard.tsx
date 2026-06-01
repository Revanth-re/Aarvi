"use client";

import { Product } from "@/types";
import { Star, ShoppingCart, Check, Eye } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store";
import { useRouter } from "next/navigation";

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // VERY IMPORTANT: Stop click from bubbling to the card
    add(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const goToDetails = () => {
    router.push(`/shop/${product._id}`);
  };

  return (
    <div
      onClick={goToDetails}
      className="card-glow rounded-2xl overflow-hidden transition-all duration-300 group hover:translate-y-[-4px]"
      style={{ 
        background: "var(--color-surface)", 
        border: "1px solid var(--color-border)", 
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer"
      }}
    >
      {/* Image */}
      <div className="h-48 overflow-hidden relative" style={{ background: "var(--color-surface-2)" }}>
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={32} style={{ color: "var(--color-text-muted)" }} />
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-xs font-bold transform translate-y-4 group-hover:translate-y-0 transition-transform">
            <Eye size={14} />
            View Details
          </span>
        </div>

        <div
          className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ 
            background: "rgba(0,0,0,0.6)", 
            color: "#fff", 
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.1)" 
          }}
        >
          {product.category}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm leading-tight mb-2 group-hover:text-[var(--color-accent)] transition-colors" style={{ color: "var(--color-text)" }}>
          {product.name}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={10}
              style={{ color: i < Math.round(product.rating) ? "#f59e0b" : "var(--color-border)" }}
              fill={i < Math.round(product.rating) ? "#f59e0b" : "none"}
            />
          ))}
          <span className="text-[10px] ml-1" style={{ color: "var(--color-text-muted)" }}>({product.reviews})</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span
            className="text-base font-bold"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}
          >
            ₹{product.price.toLocaleString("en-IN")}
          </span>

          <button
            onClick={handleAdd}
            disabled={added}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all hover:scale-110 active:scale-95"
            style={{
              background: added ? "#34d39915" : "var(--color-accent)",
              color: added ? "#34d399" : "#fff",
              border: added ? "1px solid #34d39988" : "none",
              cursor: "pointer",
              boxShadow: added ? "none" : "0 4px 12px var(--color-accent)44",
              position: "relative",
              zIndex: 10
            }}
          >
            {added ? <Check size={14}/> : <ShoppingCart size={14}/>}
            {added ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
