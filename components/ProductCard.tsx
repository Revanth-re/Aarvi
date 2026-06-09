"use client";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Star, Check } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/store";

export default function ProductCard({ product: p }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    add(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const hasDiscount = p.originalPrice && p.originalPrice > p.price;

  return (
    <Link
      href={`/shop/${p._id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        className="card card-hover"
        style={{ overflow: "hidden", cursor: "pointer" }}
      >
        {/* Image */}
        <div
          style={{
            aspectRatio: "1 / 1",
            background: "var(--surface2)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {p.images?.[0] ? (
            <img
              src={p.images[0]}
              alt={p.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingCart size={28} color="var(--text3)" />
            </div>
          )}

          {/* Category badge */}
          <span
            className="badge badge-muted"
            style={{ position: "absolute", top: 10, left: 10, textTransform: "capitalize", fontSize: 10, backdropFilter: "blur(6px)", background: "var(--bg)cc" }}
          >
            {p.category}
          </span>

          {/* Discount badge */}
          {hasDiscount && (
            <span
              className="badge badge-danger"
              style={{ position: "absolute", top: 10, right: 10, fontSize: 10 }}
            >
              Sale
            </span>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "14px 14px 12px" }}>
          <h3
            style={{
              fontSize: 13, fontWeight: 600, color: "var(--text)",
              marginBottom: 6, lineHeight: 1.35,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}
          >
            {p.name}
          </h3>

          {/* Rating */}
          {p.rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 1 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    size={10}
                    color="#f59e0b"
                    fill={n <= Math.round(p.rating) ? "#f59e0b" : "transparent"}
                  />
                ))}
              </div>
              <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--ff-mono)" }}>
                {p.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Price row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "var(--ff-mono)" }}>
                ₹{p.price.toLocaleString("en-IN")}
              </span>
              {hasDiscount && (
                <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--ff-mono)", textDecoration: "line-through" }}>
                  ₹{p.originalPrice!.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            <button
              onClick={handleAdd}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: added ? "var(--success)" : "var(--accent)",
                color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background .2s",
              }}
            >
              {added ? <Check size={13} /> : <ShoppingCart size={13} />}
            </button>
          </div>

          {/* Low stock warning */}
          {p.stock > 0 && p.stock <= 5 && (
            <p style={{ fontSize: 10, color: "var(--danger)", marginTop: 6 }}>
              Only {p.stock} left
            </p>
          )}
          {p.stock === 0 && (
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
              Out of stock
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
