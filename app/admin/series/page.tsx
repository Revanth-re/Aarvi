"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Series } from "@/types";
import { Plus, Edit2, Trash2, Star, Eye, EyeOff, TrendingUp, Search } from "lucide-react";

export default function AdminSeries() {
  const [data, setData] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [search, setSearch] = useState("");

  const load = () => fetch("/api/series?limit=100").then(r=>r.json()).then(d=>{if(Array.isArray(d))setData(d);setLoading(false);});
  useEffect(()=>{load();},[]);

  const filtered = data.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.genre.toLowerCase().includes(search.toLowerCase()));

  const del = async(id:string,title:string) => {
    if(!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/series/${id}`,{method:"DELETE"});
    setData(d=>d.filter(x=>x._id!==id));
    setDeleting(null);
  };

  const toggle = async(s:Series, field:"isFeatured"|"isTrending") => {
    await fetch(`/api/series/${s._id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({[field]:!s[field]})});
    setData(d=>d.map(x=>x._id===s._id?{...x,[field]:!s[field]}:x));
  };

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 2, letterSpacing: "-.02em" }}>Audio Series</h1>
          <p style={{ color: "var(--text3)", fontSize: 13 }}>{data.length} series total</p>
        </div>
        <Link href="/admin/series/new" className="btn btn-primary" style={{ textDecoration: "none" }}><Plus size={15}/>New Series</Link>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 360, marginBottom: 20 }}>
        <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }}/>
        <input className="inp" placeholder="Search series..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft: 34, height: 38, fontSize: 13 }}/>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height: 56 }}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text3)", marginBottom: 16, fontSize: 14 }}>{data.length===0?"No series yet. Add your first one.":"No results found."}</p>
            {data.length===0&&<Link href="/admin/series/new" className="btn btn-primary" style={{ textDecoration: "none" }}><Plus size={14}/>Add First Series</Link>}
          </div>
        ) : (
          <div className="scroll-x">
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead><tr>
                <th>Series</th><th>Genre</th><th>Eps</th><th>Rating</th><th>Plays</th><th>Flags</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {s.coverImage && <img src={s.coverImage} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}/>}
                        <div>
                          <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{s.title}</p>
                          {s.narrator && <p style={{ fontSize: 12, color: "var(--text3)" }}>by {s.narrator}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-muted">{s.genre}</span></td>
                    <td><span style={{ fontFamily: "var(--ff-mono)", fontSize: 13 }}>{s.totalEpisodes}</span></td>
                    <td><span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13 }}><Star size={11} color="#f59e0b" fill="#f59e0b"/>{s.rating}</span></td>
                    <td><span style={{ fontFamily: "var(--ff-mono)", fontSize: 12 }}>{(s.totalPlays||0).toLocaleString()}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button onClick={() => toggle(s,"isFeatured")} className={`btn btn-xs ${s.isFeatured?"btn-primary":"btn-ghost"}`} style={{ gap: 4 }}>
                          {s.isFeatured?<Eye size={10}/>:<EyeOff size={10}/>}Featured
                        </button>
                        <button onClick={() => toggle(s,"isTrending")} style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,border:`1px solid ${s.isTrending?"var(--accent2)":"var(--border2)"}`,background:s.isTrending?"var(--accent2)15":"transparent",color:s.isTrending?"var(--accent2)":"var(--text3)",cursor:"pointer",fontSize:11,fontFamily:"var(--ff-sans)" }}>
                          <TrendingUp size={10}/>Trending
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Link href={`/admin/series/${s._id}`} className="btn btn-ghost btn-xs" style={{ textDecoration: "none" }}><Edit2 size={12}/>Edit</Link>
                        <button className="btn btn-danger btn-xs" onClick={() => del(s._id,s.title)} disabled={deleting===s._id}><Trash2 size={12}/>{deleting===s._id?"...":"Del"}</button>
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
