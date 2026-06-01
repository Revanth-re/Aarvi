"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Product } from "@/types";
import { Plus, Edit2, Trash2, Star, Search } from "lucide-react";

const CATS = ["all","accessories","clothing","handicrafts","merchandise"];

export default function AdminProducts() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (cat !== "all") p.set("category", cat);
    fetch(`/api/products?${p}&limit=100`).then(r=>r.json()).then(d=>{if(Array.isArray(d))setData(d);setLoading(false);});
  };
  useEffect(()=>{load();},[cat]);

  const filtered = data.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const del = async(id:string,name:string) => {
    if(!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    await fetch(`/api/products/${id}`,{method:"DELETE"});
    setData(d=>d.filter(x=>x._id!==id));
    setDeleting(null);
  };

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 2, letterSpacing: "-.02em" }}>Products</h1>
          <p style={{ color: "var(--text3)", fontSize: 13 }}>{data.length} products in shop</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary" style={{ textDecoration: "none" }}><Plus size={15}/>New Product</Link>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }}/>
          <input className="inp" placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft: 34, height: 38, fontSize: 13 }}/>
        </div>
        {/* Category filter */}
        <div style={{ display: "flex", gap: 5 }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${cat===c?"var(--accent)":"var(--border2)"}`, background: cat===c?"var(--accent)":"transparent", color: cat===c?"#fff":"var(--text3)", fontSize: 12, cursor: "pointer", textTransform: "capitalize", fontWeight: cat===c?600:400 }}>{c}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height: 56 }}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text3)", fontSize: 14, marginBottom: 16 }}>{data.length===0?"No products yet.":"No results found."}</p>
            {data.length===0&&<Link href="/admin/products/new" className="btn btn-primary" style={{ textDecoration: "none" }}><Plus size={14}/>Add First Product</Link>}
          </div>
        ) : (
          <div className="scroll-x">
            <table className="tbl" style={{ minWidth: 580 }}>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}/>}
                        <div>
                          <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                          <p style={{ fontSize: 11, color: "var(--text3)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-muted" style={{ textTransform: "capitalize" }}>{p.category}</span></td>
                    <td><span style={{ fontFamily: "var(--ff-mono)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>₹{p.price.toLocaleString("en-IN")}</span></td>
                    <td><span style={{ fontFamily: "var(--ff-mono)", fontSize: 13, color: p.stock > 10 ? "var(--text3)" : "var(--danger)" }}>{p.stock}</span></td>
                    <td><span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13 }}><Star size={11} color="#f59e0b" fill="#f59e0b"/>{p.rating}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Link href={`/admin/products/${p._id}`} className="btn btn-ghost btn-xs" style={{ textDecoration: "none" }}><Edit2 size={12}/>Edit</Link>
                        <button className="btn btn-danger btn-xs" onClick={() => del(p._id,p.name)} disabled={deleting===p._id}><Trash2 size={12}/>{deleting===p._id?"...":"Del"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
