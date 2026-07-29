"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Flame, Compass, Star, X } from "lucide-react";
import { DiscoverPayload, RisingCreator, Series } from "@/types";
import { useApp, useToast } from "@/store";
import Avatar from "@/components/ui/Avatar";
import { Screen, SectionHeader, ShowCard } from "./MobileKit";

export default function MobileDiscover() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [data, setData] = useState<DiscoverPayload | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Series[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const qs = user ? `?userId=${user._id}` : "";
    fetch(`/api/discover${qs}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch(() => {});
  }, [user?._id]);

  // Debounced search. Without the delay this fires a request per
  // keystroke, which on a phone keyboard is a request every ~80ms.
  // All the setState calls happen inside the timeout callback rather
  // than in the effect body, so nothing updates state synchronously
  // during the effect.
  useEffect(() => {
    const q = query.trim();

    const t = setTimeout(() => {
      if (!q) { setResults(null); setSearching(false); return; }

      setSearching(true);
      fetch(`/api/series?search=${encodeURIComponent(q)}&limit=20`)
        .then(r => r.json())
        .then(d => setResults(Array.isArray(d) ? d : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, q ? 300 : 0);

    return () => clearTimeout(t);
  }, [query]);

  const toggleFollow = useCallback(async (c: RisingCreator) => {
    if (!user) { showToast("Log in to follow creators", "info"); return; }

    // Optimistic — reverted below if the request fails.
    setData(prev => prev && ({
      ...prev,
      creators: prev.creators.map(x =>
        x._id === c._id ? { ...x, isFollowing: !x.isFollowing } : x),
    }));

    try {
      // Note the direction: the route is /api/users/<ACTOR>/follow with
      // the person being followed in the body as `targetId`.
      const r = await fetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: c._id }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      // Follows are request-based (see models/User.ts), so a successful
      // call means "requested", not "following", until they accept.
      showToast(d.status === "requested" ? "Follow request sent" : "Unfollowed", "success");
    } catch {
      setData(prev => prev && ({
        ...prev,
        creators: prev.creators.map(x =>
          x._id === c._id ? { ...x, isFollowing: c.isFollowing } : x),
      }));
      showToast("Couldn't update follow", "error");
    }
  }, [user?._id, showToast]);

  return (
    <Screen>
      <div className="font-display" style={{ fontSize: 22, fontWeight: 400, color: "var(--text)" }}>
        Discover
      </div>

      {/* ── Search ── */}
      <div style={{ position: "relative" }}>
        <Search size={16} color="var(--text3)" style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
        }}/>
        <input
          className="inp"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search shows, voices, creators..."
          style={{ paddingLeft: 38, paddingRight: query ? 38 : 14, borderRadius: 999 }}
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "var(--text3)",
            display: "flex",
          }}>
            <X size={15}/>
          </button>
        )}
      </div>

      {/* ── Search results replace the browse view while typing ── */}
      {results !== null ? (
        <div>
          <SectionHeader title={searching ? "Searching…" : `${results.length} results`}/>
          {results.length === 0 && !searching ? (
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              Nothing matched “{query}”.
            </p>
          ) : (
            <div className="grid-cards">
              {results.map(s => <ShowCard key={s._id} series={s} size={150}/>)}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Trending searches ── */}
          {!!data?.trendingTags.length && (
            <div>
              <SectionHeader title="Trending searches" icon={<Flame size={15} color="var(--warning)"/>}/>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.trendingTags.map(t => (
                  <button key={t} onClick={() => setQuery(t.replace(/^#/, ""))} style={{
                    padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                    fontSize: 12, fontWeight: 600, fontFamily: "var(--ff-sans)",
                    background: "var(--accent)15", color: "var(--accent)",
                    border: "1px solid var(--accent)30",
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Genre tiles ── */}
          <div>
            <SectionHeader title="Browse genres" icon={<Compass size={15} color="var(--accent)"/>}/>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {(data?.genres ?? []).map(g => (
                <Link key={g.name} href={`/series?genre=${encodeURIComponent(g.name)}`}
                  style={{
                    height: 82, borderRadius: 16, background: g.gradient,
                    padding: 12, display: "flex", flexDirection: "column",
                    justifyContent: "flex-end", textDecoration: "none",
                    position: "relative", overflow: "hidden",
                  }}>
                  <span style={{
                    fontSize: 13.5, fontWeight: 700, color: "#fff",
                    textShadow: "0 1px 4px rgba(0,0,0,.35)",
                  }}>
                    {g.name}
                  </span>
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.85)" }}>
                    {g.count} {g.count === 1 ? "series" : "series"}
                  </span>
                </Link>
              ))}
              {!data && [0, 1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 82, borderRadius: 16 }}/>
              ))}
            </div>
          </div>

          {/* ── Rising creators ── */}
          {!!data?.creators.length && (
            <div>
              <SectionHeader title="Rising creators" icon={<Star size={15} color="var(--accent2)"/>}/>
              <div className="no-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {data.creators.map(c => (
                  <div key={c._id} style={{
                    flex: "none", width: 116, background: "var(--surface)",
                    border: "1px solid var(--border)", borderRadius: 16,
                    padding: 12, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 8,
                  }}>
                    <Link href={`/u/${c._id}`}>
                      <Avatar name={c.name} image={c.image} size={44}/>
                    </Link>
                    <div className="truncate" style={{
                      fontSize: 11.5, fontWeight: 700, color: "var(--text)",
                      maxWidth: "100%", textAlign: "center",
                    }}>
                      {c.handle}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>
                      {c.followerCount} followers
                    </div>
                    <button
                      onClick={() => toggleFollow(c)}
                      style={{
                        width: "100%", padding: "5px 0", borderRadius: 999,
                        fontSize: 11, fontWeight: 700, cursor: c.isFollowing ? "default" : "pointer",
                        fontFamily: "var(--ff-sans)", border: "none",
                        background: c.isFollowing ? "var(--surface2)" : "var(--accent)",
                        color: c.isFollowing ? "var(--text3)" : "#fff",
                      }}>
                      {c.isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Screen>
  );
}
