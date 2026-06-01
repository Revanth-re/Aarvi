"use client";

import { useCart } from "@/store";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, ShieldCheck, Truck } from "lucide-react";

export default function CartPageClient() {
  const { items, remove, qty, total, clear } = useCart();
  const totalPrice = total();
  const itemCount = items.reduce((a, i) => a + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <ShoppingBag size={32} style={{ color: "var(--color-text-muted)" }} />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
          Your cart is empty
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)", maxWidth: 400, margin: "0 auto 32px" }}>
          Discover our exclusive collection of custom series t-shirts and Indian handicrafts.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-105"
          style={{ background: "var(--color-accent)", color: "#fff", boxShadow: "0 10px 30px var(--color-accent)44" }}
        >
          Explore Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Cart Section */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
            >
              Shopping Cart
              <span className="text-lg ml-4 font-medium opacity-50">
                ({itemCount} items)
              </span>
            </h1>
            <button 
              onClick={clear}
              className="text-xs font-semibold uppercase tracking-widest hover:text-red-500 transition-colors"
              style={{ color: "var(--color-text-muted)" }}
            >
              Clear Cart
            </button>
          </div>

          <div className="space-y-4">
            {items.map(({ product, quantity }) => (
              <div
                key={product._id}
                className="flex flex-col sm:flex-row gap-6 p-6 rounded-3xl transition-all"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <Link href={`/shop/${product._id}`} className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                </Link>

                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-base mb-1" style={{ color: "var(--color-text)" }}>{product.name}</h3>
                      <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: "var(--color-accent)" }}>{product.category}</p>
                    </div>
                    <span className="font-bold text-lg" style={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>
                      ₹{(product.price * quantity).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    {/* Qty */}
                    <div
                      className="flex items-center p-1 rounded-xl"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                    >
                      <button
                        onClick={() => qty(product._id, quantity - 1)}
                        className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-[var(--color-surface-2)] rounded-lg"
                        style={{ color: "var(--color-text)" }}
                      >
                        <Minus size={14} />
                      </button>
                      <span
                        className="w-10 h-10 flex items-center justify-center text-sm font-bold"
                        style={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}
                      >
                        {quantity}
                      </span>
                      <button
                        onClick={() => qty(product._id, quantity + 1)}
                        className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-[var(--color-surface-2)] rounded-lg"
                        style={{ color: "var(--color-text)" }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => remove(product._id)}
                      className="flex items-center gap-2 text-xs font-bold transition-colors hover:text-red-500"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-all"
              style={{ color: "var(--color-text)" }}
            >
              <ArrowLeft size={16} />
              Back to Shopping
            </Link>
          </div>
        </div>

        {/* Summary Sticky Section */}
        <div className="lg:w-96">
          <div
            className="p-8 rounded-3xl sticky top-24"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
          >
            <h3 className="text-xl font-bold mb-8" style={{ color: "var(--color-text)" }}>Order Summary</h3>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--color-text-muted)" }}>Subtotal</span>
                <span className="font-bold" style={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>₹{totalPrice.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--color-text-muted)" }}>Shipping</span>
                <span className="font-bold" style={{ color: totalPrice > 999 ? "#34d399" : "var(--color-text)" }}>
                  {totalPrice > 999 ? "FREE" : "₹99"}
                </span>
              </div>
              <div
                className="pt-6 border-t flex justify-between items-center"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="font-bold text-lg" style={{ color: "var(--color-text)" }}>Total</span>
                <span className="text-2xl font-bold" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
                  ₹{(totalPrice + (totalPrice > 999 ? 0 : 99)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {totalPrice <= 999 && (
              <div className="mb-8 p-4 rounded-2xl text-center" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-muted)" }}>Free Shipping Goal</p>
                <div className="w-full h-1.5 bg-gray-800 rounded-full mb-2 overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${(totalPrice / 999) * 100}%` }} />
                </div>
                <p className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Add ₹{(999 - totalPrice).toLocaleString("en-IN")} more for free shipping
                </p>
              </div>
            )}

            <button
              className="w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--color-accent)", color: "#fff", boxShadow: "0 10px 30px var(--color-accent)44" }}
            >
              Checkout Now
              <ArrowRight size={18} />
            </button>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-[10px] font-medium opacity-60">
                <Truck size={14} />
                <span>Fast & Secure Delivery in 3-5 Days</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-medium opacity-60">
                <ShieldCheck size={14} />
                <span>100% Authentic Handcrafted Quality</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
