"use client";
import Link from "next/link";
import { useCart } from "@/store";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, Tag } from "lucide-react";

export default function CartPage() {
  const { items, remove, qty, total, clear } = useCart();

  if (items.length === 0) return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <ShoppingBag size={30} color="var(--text3)"/>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Your cart is empty</h2>
      <p style={{ color: "var(--text3)", marginBottom: 28, fontSize: 14, lineHeight: 1.6 }}>You haven't added anything yet. Explore our shop to find something you'll love.</p>
      <Link href="/shop" className="btn btn-primary" style={{ textDecoration: "none" }}><ShoppingBag size={15}/>Browse Shop</Link>
    </div>
  );

  const subtotal = total();
  const shipping = subtotal > 999 ? 0 : 99;
  const grandTotal = subtotal + shipping;

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <Link href="/shop" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13, marginBottom: 28, transition: "color .15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color="var(--text)"}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color="var(--text3)"}>
        <ArrowLeft size={14}/>Continue shopping
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", marginBottom: 32, letterSpacing: "-.02em" }}>
        Cart <span style={{ fontSize: 16, fontWeight: 400, color: "var(--text3)" }}>({items.reduce((a,i)=>a+i.quantity,0)} items)</span>
      </h1>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Items */}
        <div style={{ flex: 2, minWidth: 300, display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(({ product: p, quantity: q }) => (
            <div key={p._id} className="card" style={{ display: "flex", gap: 14, padding: 14, alignItems: "center" }}>
              <div style={{ width: 76, height: 76, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--surface2)" }}>
                {p.images?.[0] && <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</h3>
                <span className="badge badge-muted" style={{ textTransform: "capitalize", fontSize: 10, marginBottom: 10, display: "inline-flex" }}>{p.category}</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border2)", borderRadius: 8, overflow: "hidden" }}>
                    <button onClick={() => qty(p._id, q-1)} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={12}/></button>
                    <span style={{ width: 32, textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: "var(--ff-mono)" }}>{q}</span>
                    <button onClick={() => qty(p._id, q+1)} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={12}/></button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "var(--ff-mono)", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>₹{(p.price*q).toLocaleString("en-IN")}</span>
                    <button onClick={() => remove(p._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 4, transition: "color .15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color="var(--danger)"}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color="var(--text3)"}>
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={clear} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 13, padding: "4px 0" }}>Clear all items</button>
        </div>

        {/* Summary */}
        <div style={{ flex: 1, minWidth: 260, position: "sticky", top: 80 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Order Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text3)" }}>
                <span>Subtotal</span>
                <span style={{ fontFamily: "var(--ff-mono)" }}>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text3)" }}>
                <span>Shipping</span>
                <span style={{ color: shipping===0?"var(--success)":undefined }}>{shipping===0?"Free":"₹99"}</span>
              </div>
              <div style={{ height: 1, background: "var(--border)" }}/>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                <span>Total</span>
                <span style={{ fontFamily: "var(--ff-mono)", color: "var(--accent)" }}>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
            {shipping > 0 && (
              <div style={{ background: "var(--accent)10", border: "1px solid var(--accent)20", borderRadius: 8, padding: "10px 12px", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                <Tag size={13} color="var(--accent)"/>
                <span style={{ fontSize: 12, color: "var(--text2)" }}>Add ₹{(1000-subtotal).toLocaleString("en-IN")} more for <strong>free shipping</strong></span>
              </div>
            )}
            <button className="btn btn-primary" style={{ width: "100%", padding: "13px", fontSize: 15, justifyContent: "center", boxShadow: "0 4px 16px var(--accent)30" }}>
              Checkout <ArrowRight size={16}/>
            </button>
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 12 }}>Secure checkout · Free returns</p>
          </div>
        </div>
      </div>
    </div>
  );
}
