"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SeriesCard from "@/components/SeriesCard";
import { Series } from "@/types";
import { Search, X, SlidersHorizontal } from "lucide-react";

const GENRES = ["All","Thriller","Historical Adventure","Romance Drama","Sci-Fi","Folklore","Cyber Thriller"];

function Content() {
  const sp = useSearchParams();
  const [data, setData] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState(sp.get("genre") || "All");
  const [sort, setSort] = useState("totalPlays");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (genre !== "All") p.set("genre", genre);
    if (search) p.set("search", search);
    const r = await fetch(`/api/series?${p}`);
    const d = await r.json();
    if (Array.isArray(d)) {
      setData([...d].sort((a, b) => sort === "rating" ? b.rating - a.rating : sort === "title" ? a.title.localeCompare(b.title) : b.totalPlays - a.totalPlays));
    }
    setLoading(false);
  }, [genre, search, sort]);

  useEffect(() => { const t = setTimeout(load, 280); return () => clearTimeout(t); }, [load]);

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 4, letterSpacing: "-.02em" }}>All Series</h1>
        <p style={{ color: "var(--text3)", fontSize: 14 }}>{data.length} series available</p>
      </div>

      {/* Search + sort */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }}/>
          <input className="inp" placeholder="Search series, genres, moods..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }}/>
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--text3)" }}><X size={14}/></button>}
        </div>
        <select className="inp" value={sort} onChange={e => setSort(e.target.value)} style={{ width: "auto", paddingRight: 36 }}>
          <option value="totalPlays">Most Played</option>
          <option value="rating">Top Rated</option>
          <option value="title">A – Z</option>
        </select>
      </div>

      {/* Genre chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        {GENRES.map(g => (
          <button key={g} onClick={() => setGenre(g)} style={{ padding: "7px 15px", borderRadius: 99, border: `1px solid ${genre===g?"var(--accent)":"var(--border2)"}`, background: genre===g?"var(--accent)":"transparent", color: genre===g?"#fff":"var(--text3)", fontSize: 13, cursor: "pointer", fontWeight: genre===g?600:400, transition: "all .15s" }}>
            {g}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid-cards">
        {loading ? [...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280 }}/>) :
         data.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: "var(--text3)", fontSize: 15 }}>No series match your search.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setGenre("All"); }} style={{ marginTop: 12 }}>Clear filters</button>
          </div>
         ) : data.map(s => <SeriesCard key={s._id} series={s}/>)}
      </div>
    </div>
  );
}

export default function SeriesPage() { return <Suspense><Content/></Suspense>; }
