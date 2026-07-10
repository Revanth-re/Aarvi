"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Series } from "@/types";
import { Plus, Edit2, Trash2, Star, Eye, EyeOff, TrendingUp, Search, X } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import { useToast } from "@/store";

export default function AdminSeries() {
  const [data, setData]         = useState<Series[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const showToast = useToast(s => s.show);

  const load = () =>
    fetch("/api/series?limit=100")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); setLoading(false); });

  useEffect(() => { load(); }, []);

  const filtered = data.filter(s =>
    !search ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.genre.toLowerCase().includes(search.toLowerCase())
  );

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await adminFetch(`/api/series/${id}`, { method: "DELETE" });
      if (!res.ok) { showToast("Couldn't delete series", "error"); return; }
      setData(d => d.filter(x => x._id !== id));
      showToast(`"${title}" deleted`, "success");
    } catch { showToast("Network error — couldn't delete series", "error"); }
    finally { setDeleting(null); }
  };

  const toggle = async (s: Series, field: "isFeatured" | "isTrending") => {
    try {
      const res = await adminFetch(`/api/series/${s._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !s[field] }),
      });
      if (!res.ok) { showToast("Couldn't update series", "error"); return; }
      setData(d => d.map(x => x._id === s._id ? { ...x, [field]: !s[field] } : x));
    } catch { showToast("Network error", "error"); }
  };

  return (
    <div style={{ padding: "clamp(14px, 3vw, 28px)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "clamp(18px, 3vw, 22px)", fontWeight: 700, color: "var(--text)", marginBottom: 2, letterSpacing: "-.02em" }}>
            Audio Series
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 12 }}>{data.length} series total</p>
        </div>
        <Link href="/admin/series/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none", flexShrink: 0 }}>
          <Plus size={14} />New Series
        </Link>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }} />
        <input
          className="inp" placeholder="Search series…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 32, paddingRight: search ? 32 : 12, height: 38, fontSize: 13 }}
        />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 2 }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text3)", marginBottom: 16, fontSize: 14 }}>
            {data.length === 0 ? "No series yet. Add your first one." : "No results found."}
          </p>
          {data.length === 0 && (
            <Link href="/admin/series/new" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
              <Plus size={13} />Add First Series
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Mobile card list (< 640px) ── */}
          <div className="series-mobile-list">
            {filtered.map(s => (
              <div key={s._id} className="card" style={{ padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {s.coverImage
                    ? <img src={s.coverImage} alt="" style={{ width: 48, height: 48, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 9, background: "var(--surface2)", flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</p>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="badge badge-muted" style={{ fontSize: 10 }}>{s.genre}</span>
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>{s.totalEpisodes} eps</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11 }}>
                        <Star size={10} color="#f59e0b" fill="#f59e0b" />{s.rating}
                      </span>
                    </div>
                    {/* Toggle flags */}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button onClick={() => toggle(s, "isFeatured")}
                        className={`btn btn-xs ${s.isFeatured ? "btn-primary" : "btn-ghost"}`}>
                        {s.isFeatured ? <Eye size={10} /> : <EyeOff size={10} />}Featured
                      </button>
                      <button onClick={() => toggle(s, "isTrending")}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 6, border: `1px solid ${s.isTrending ? "var(--accent2)" : "var(--border2)"}`, background: s.isTrending ? "var(--accent2)15" : "transparent", color: s.isTrending ? "var(--accent2)" : "var(--text3)", cursor: "pointer", fontSize: 11, fontFamily: "var(--ff-sans)" }}>
                        <TrendingUp size={10} />Trending
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <Link href={`/admin/series/${s._id}`} className="btn btn-ghost btn-xs" style={{ textDecoration: "none" }}><Edit2 size={12} /></Link>
                    <button className="btn btn-danger btn-xs" onClick={() => del(s._id, s.title)} disabled={deleting === s._id}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (≥ 640px) ── */}
          <div className="card series-desktop-table" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl" style={{ minWidth: 620 }}>
                <thead>
                  <tr>
                    <th>Series</th><th>Genre</th><th>Eps</th><th>Rating</th><th>Plays</th><th>Flags</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {s.coverImage && <img src={s.coverImage} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{s.title}</p>
                            {s.narrator && <p style={{ fontSize: 11, color: "var(--text3)" }}>by {s.narrator}</p>}
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-muted">{s.genre}</span></td>
                      <td><span style={{ fontFamily: "var(--ff-mono)", fontSize: 13 }}>{s.totalEpisodes}</span></td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13 }}>
                          <Star size={11} color="#f59e0b" fill="#f59e0b" />{s.rating}
                        </span>
                      </td>
                      <td><span style={{ fontFamily: "var(--ff-mono)", fontSize: 12 }}>{(s.totalPlays || 0).toLocaleString()}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => toggle(s, "isFeatured")} className={`btn btn-xs ${s.isFeatured ? "btn-primary" : "btn-ghost"}`}>
                            {s.isFeatured ? <Eye size={10} /> : <EyeOff size={10} />}Feat.
                          </button>
                          <button onClick={() => toggle(s, "isTrending")}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: `1px solid ${s.isTrending ? "var(--accent2)" : "var(--border2)"}`, background: s.isTrending ? "var(--accent2)15" : "transparent", color: s.isTrending ? "var(--accent2)" : "var(--text3)", cursor: "pointer", fontSize: 11, fontFamily: "var(--ff-sans)" }}>
                            <TrendingUp size={10} />Trend
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Link href={`/admin/series/${s._id}`} className="btn btn-ghost btn-xs" style={{ textDecoration: "none" }}><Edit2 size={12} />Edit</Link>
                          <button className="btn btn-danger btn-xs" onClick={() => del(s._id, s.title)} disabled={deleting === s._id}>
                            <Trash2 size={12} />{deleting === s._id ? "…" : "Del"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 639px) {
          .series-mobile-list   { display: block !important; }
          .series-desktop-table { display: none !important; }
        }
        @media (min-width: 640px) {
          .series-mobile-list   { display: none !important; }
          .series-desktop-table { display: block !important; }
        }
      `}</style>
    </div>
  );
}
