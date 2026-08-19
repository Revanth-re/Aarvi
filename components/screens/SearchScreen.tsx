"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, X, TrendingUp, Compass, Mic, Loader2 } from "lucide-react";
import { SearchPayload } from "@/types";
import { useApp, useToast } from "@/store";
import { genreColor } from "@/lib/gamification";
import { Screen, ShowCard, SectionHeader } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import ThoughtCard from "./ThoughtCard";
import Avatar from "@/components/ui/Avatar";

const GENRES = [
  "Thriller", "Romance", "Mythology", "Horror", "Mystery",
  "Comedy", "Sci-Fi", "Coming of Age", "True Crime", "Campus",
  "Devotional", "Friendship",
];

export default function SearchScreen() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchPayload | null>(null);
  const [searching, setSearching] = useState(false);

  // Debounced: on a phone keyboard an undebounced search fires a
  // request roughly every 80ms.
  useEffect(() => {
    const term = q.trim();
    let cancelled = false;

    const t = setTimeout(() => {
      if (term) setSearching(true);
      const qs = new URLSearchParams({ q: term });
      if (user) qs.set("userId", user._id);

      fetch(`/api/search?${qs}`)
        .then(r => r.json())
        .then(d => { if (!cancelled && !d.error) setData(d); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setSearching(false); });
    }, term ? 300 : 0);

    return () => { cancelled = true; clearTimeout(t); };
  }, [q, user?._id]);

  // Voice search uses the browser's SpeechRecognition, which only
  // Chromium-based browsers ship. The mic is hidden elsewhere rather
  // than rendering a button that silently does nothing.
  // Lazy initial state rather than an effect: this is a one-time
  // capability check, not something that changes. `typeof window`
  // keeps it safe during server rendering.
  const [micAvailable] = useState(() =>
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));

  const listen = () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const Rec = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = "en-IN";
    rec.onresult = (e: any) => setQ(e.results[0][0].transcript);
    rec.onerror = () => showToast("Couldn't hear that", "error");
    rec.start();
    showToast("Listening…", "info");
  };

  const hasQuery = !!q.trim();
  const results = data;

  return (
    <>
      <TopBar title="Search"/>
      <Screen>
        <div style={{ position: "relative" }}>
          <SearchIcon size={17} color="var(--text3)" style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)" }}/>
          <input
            className="inp" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Series, creators, moods, 💬 thoughts…"
            aria-label="Search"
            style={{ paddingLeft: 40, paddingRight: micAvailable || q ? 44 : 16 }}
          />
          {q ? (
            <button onClick={() => setQ("")} aria-label="Clear" style={iconInInput}><X size={16}/></button>
          ) : micAvailable ? (
            <button onClick={listen} aria-label="Voice search" style={{ ...iconInInput, color: "var(--accent)" }}>
              <Mic size={16}/>
            </button>
          ) : null}
        </div>

        {hasQuery ? (
          <>
            {searching && !results ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", fontSize: 12.5 }}>
                  <Loader2 size={14} className="spin"/>Searching…
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ aspectRatio: "0.72", borderRadius: 14 }}/>)}
                </div>
              </div>
            ) : searching && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", fontSize: 12.5 }}>
                <Loader2 size={14} className="spin"/>Searching…
              </div>
            )}

            {!!results?.series.length && (
              <section>
                <SectionHeader title={`Series · ${results.series.length}`}/>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {results.series.map(s => <ShowCard key={s._id} series={s} width={150}/>)}
                </div>
              </section>
            )}

            {!!results?.creators.length && (
              <section>
                <SectionHeader title="Creators"/>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {results.creators.map(c => (
                    <Link key={c._id} href={`/u/${c._id}`} className="card"
                      style={{ display: "flex", alignItems: "center", gap: 11, padding: 11, textDecoration: "none" }}>
                      <Avatar name={c.name} image={c.image} size={38}/>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="truncate" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{c.name}</span>
                        <span className="truncate" style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>
                          {c.handle} · {c.followerCount} followers
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {!!results?.thoughts.length && (
              <section>
                <SectionHeader title="Thoughts"/>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {results.thoughts.map(t => <ThoughtCard key={t._id} thought={t}/>)}
                </div>
              </section>
            )}

            {!searching && results
              && !results.series.length && !results.creators.length && !results.thoughts.length && (
              <p style={{ fontSize: 13, color: "var(--text3)", padding: "24px 0", textAlign: "center" }}>
                Nothing matched “{q}”.
              </p>
            )}
          </>
        ) : (
          <>
            {!!results?.trending.length && (
              <section>
                <SectionHeader title="Trending searches" icon={<TrendingUp size={15} color="var(--accent)"/>}/>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {results.trending.map(t => (
                    <button key={t} className="chip" onClick={() => setQ(t)}>{t}</button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionHeader title="Browse genres" icon={<Compass size={15} color="var(--accent)"/>}/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {GENRES.map(g => (
                  <Link key={g} href={`/discover?genre=${encodeURIComponent(g)}`}
                    style={{
                      height: 62, borderRadius: "var(--r-pill)", background: genreColor(g),
                      display: "flex", alignItems: "center", padding: "0 18px",
                      textDecoration: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                      textShadow: "0 1px 3px rgba(0,0,0,.28)",
                    }}>
                    {g}
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </Screen>
    </>
  );
}

const iconInInput: React.CSSProperties = {
  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer",
  color: "var(--text3)", display: "flex", padding: 0,
};
