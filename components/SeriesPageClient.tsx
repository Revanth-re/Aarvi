"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Series } from "@/types";
import SeriesCard from "@/components/SeriesCard";
import { Search, SlidersHorizontal, X } from "lucide-react";

const GENRES = ["All", "Thriller", "Historical Adventure", "Romance Drama", "Sci-Fi", "Folklore", "Cyber Thriller"];

export default function SeriesPageClient() {
  const searchParams = useSearchParams();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState(searchParams.get("genre") || "All");
  const [sortBy, setSortBy] = useState("totalPlays");

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (genre !== "All") params.set("genre", genre);
      if (search) params.set("search", search);
      params.set("limit", "50");
      const res = await fetch(`/api/series?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => {
          if (sortBy === "rating") return b.rating - a.rating;
          if (sortBy === "totalPlays") return b.totalPlays - a.totalPlays;
          if (sortBy === "title") return a.title.localeCompare(b.title);
          return 0;
        });
        setSeries(sorted);
      }
    } finally {
      setLoading(false);
    }
  }, [genre, search, sortBy]);

  useEffect(() => {
    const timer = setTimeout(fetchSeries, 300);
    return () => clearTimeout(timer);
  }, [fetchSeries]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", fontSize: "2.2rem" }}
        >
          All Series
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {series.length} series available
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <input
            type="text"
            placeholder="Search series, genres, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
              <X size={14} style={{ color: "var(--color-text-muted)" }} />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        >
          <option value="totalPlays">Most Played</option>
          <option value="rating">Top Rated</option>
          <option value="title">A–Z</option>
        </select>
      </div>

      {/* Genre filters — horizontal scroll */}
      <div className="scroll-x no-scroll" style={{ display: "flex", gap: 8, marginBottom: 32, paddingBottom: 4 }}>
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className="transition-all"
            style={{
              padding: "7px 18px",
              borderRadius: 99,
              fontSize: 13,
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: genre === g ? "var(--color-accent)" : "var(--color-surface)",
              color: genre === g ? "var(--color-bg)" : "var(--color-text-muted)",
              border: `1px solid ${genre === g ? "var(--color-accent)" : "var(--color-border)"}`,
              fontWeight: genre === g ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton rounded-2xl h-64" />)}
        </div>
      ) : series.length === 0 ? (
        <div className="text-center py-20">
          <p style={{ color: "var(--color-text-muted)" }}>No series found. Try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {series.map((s) => <SeriesCard key={s._id} series={s} />)}
        </div>
      )}
    </div>
  );
}
