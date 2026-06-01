"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Series } from "@/types";
import EpisodeRow from "@/components/EpisodeRow";
import { usePlayer, useApp } from "@/store";
import { Play, Heart, Star, Users, Globe, Mic, BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";

function formatPlays(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

export default function SeriesDetailClient() {
  const params = useParams();
  const id = params.id as string;
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"episodes" | "about">("episodes");
  const { setEp } = usePlayer();
  const { liked, toggleLike } = useApp();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/series/${id}`)
      .then((r) => r.json())
      .then((data) => { setSeries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="skeleton rounded-3xl h-72 mb-8" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton rounded-xl h-16" />)}
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "var(--color-text-muted)" }}>Series not found.</p>
        <Link href="/series" className="mt-4 inline-block text-sm" style={{ color: "var(--color-accent)" }}>
          Back to series
        </Link>
      </div>
    );
  }

  const isLiked = liked.includes(series._id);
  const firstFreeEp = series.episodes?.find((e) => !e.isLocked);

  const playFirst = () => {
    if (firstFreeEp) setEp(firstFreeEp, series);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link
        href="/series"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
        style={{ color: "var(--color-text-muted)" }}
      >
        <ArrowLeft size={15} />
        All Series
      </Link>

      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-3xl mb-8"
        style={{ background: "var(--color-surface)" }}
      >
        {/* Background image */}
        {series.coverImage && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={series.coverImage} alt="" className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, var(--color-surface) 40%, transparent)" }} />
          </div>
        )}

        <div className="relative flex flex-col sm:flex-row gap-6 p-6 sm:p-8">
          {/* Cover */}
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: "var(--color-surface-2)" }}>
            {series.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={series.coverImage} alt={series.title} className="w-full h-full object-cover" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
              >
                {series.genre}
              </span>
              {series.isTrending && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "var(--color-accent-2)", color: "var(--color-bg)" }}
                >
                  Trending
                </span>
              )}
            </div>

            <h1
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 600, color: "var(--color-text)", lineHeight: 1.15 }}
              className="mb-3"
            >
              {series.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <Star size={14} style={{ color: "#f59e0b" }} fill="#f59e0b" />
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{series.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} style={{ color: "var(--color-text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{formatPlays(series.totalPlays)} plays</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen size={14} style={{ color: "var(--color-text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{series.totalEpisodes} episodes</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe size={14} style={{ color: "var(--color-text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{series.language}</span>
              </div>
            </div>

            {series.narrator && (
              <div className="flex items-center gap-1.5 mb-4">
                <Mic size={13} style={{ color: "var(--color-text-muted)" }} />
                <span className="text-sm italic" style={{ color: "var(--color-text-muted)" }}>Narrated by {series.narrator}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              {firstFreeEp && (
                <button
                  onClick={playFirst}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
                  style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
                >
                  <Play size={15} fill="currentColor" />
                  Play First Episode
                </button>
              )}
              <button
                onClick={() => toggleLike(series._id)}
                className="p-2.5 rounded-xl transition-colors"
                style={{
                  background: isLiked ? "var(--color-accent-2)" + "22" : "var(--color-surface-2)",
                  color: isLiked ? "var(--color-accent-2)" : "var(--color-text-muted)",
                  border: "1px solid var(--color-border)"
                }}
              >
                <Heart size={17} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        {(["episodes", "about"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all"
            style={{
              background: activeTab === tab ? "var(--color-accent)" : "transparent",
              color: activeTab === tab ? "var(--color-bg)" : "var(--color-text-muted)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Episodes tab */}
      {activeTab === "episodes" && (
        <div className="space-y-1">
          {series.episodes?.map((ep, i) => (
            <EpisodeRow key={ep._id} episode={ep} series={series} index={i} />
          ))}
        </div>
      )}

      {/* About tab */}
      {activeTab === "about" && (
        <div
          className="p-6 rounded-2xl"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)", fontSize: "1.3rem" }}>
            About this series
          </h3>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--color-text-muted)", lineHeight: 1.8 }}>
            {series.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Genre", value: series.genre },
              { label: "Language", value: series.language },
              { label: "Narrator", value: series.narrator || "—" },
              { label: "Episodes", value: series.totalEpisodes.toString() },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl" style={{ background: "var(--color-surface-2)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>{item.label}</p>
                <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{item.value}</p>
              </div>
            ))}
          </div>

          {series.tags && series.tags.length > 0 && (
            <div className="mt-6">
              <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>Tags</p>
              <div className="flex flex-wrap gap-2">
                {series.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


