"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, TrendingUp, Sun, Sparkles, Play, UserPlus, Check, Globe } from "lucide-react";
import { DiscoverPayload, VIBES, LANGUAGES, CreatorCard } from "@/types";
import { useApp, usePlayer, useToast, useDataCache, cacheKeyFor } from "@/store";
import { Screen, SectionHeader, ShowCard, ShowCardSkeleton, Cover } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";

const VIBE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Moon, TrendingUp, Sun, Sparkles,
};

export default function DiscoverScreen() {
  const user = useApp(s => s.user);
  const setEp = usePlayer(s => s.setEp);
  const showToast = useToast(s => s.show);

  const [vibe, setVibe] = useState("");
  const [language, setLanguage] = useState("All");

  const cacheKey = cacheKeyFor("discover", user?._id, vibe || "none", language);
  const cached = useDataCache(s => s.cache[cacheKey]) as DiscoverPayload | undefined;
  const setCache = useDataCache(s => s.setCache);

  const [data, setData] = useState<DiscoverPayload | null>(cached ?? null);
  const [loaded, setLoaded] = useState(!!cached);

  // Derived, so nothing has to setState before the effect's first
  // await — which is what causes a cascading render.
  const loading = !loaded;

  useEffect(() => {
    let cancelled = false;

    const qs = new URLSearchParams();
    if (user) qs.set("userId", user._id);
    if (vibe) qs.set("vibe", vibe);
    if (language !== "All") qs.set("language", language);

    fetch(`/api/discover?${qs}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && !d.error) { setData(d); setCache(cacheKey, d); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [user?._id, vibe, language]);

  const toggleFollow = async (c: CreatorCard) => {
    if (!user) { showToast("Log in to follow creators", "info"); return; }

    // Optimistic — reverted below if the request fails.
    setData(prev => prev && {
      ...prev,
      creators: prev.creators.map(x => x._id === c._id ? { ...x, isFollowing: !x.isFollowing } : x),
    });

    try {
      // Direction matters: the route is /api/users/<ACTOR>/follow with
      // the person being followed in the body.
      const r = await fetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: c._id }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      const label = d.status === "requested" ? "Follow request sent"
        : d.status === "following" ? "Followed"
        : "Unfollowed";
      showToast(label, "success");
    } catch {
      setData(prev => prev && {
        ...prev,
        creators: prev.creators.map(x => x._id === c._id ? { ...x, isFollowing: c.isFollowing } : x),
      });
      showToast("Couldn't update follow", "error");
    }
  };

  return (
    <>
      <TopBar title="Discover"/>
      <Screen>
        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Discover
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)", margin: "4px 0 0" }}>
            Tell us the vibe, we&apos;ll do the rest.
          </p>
        </div>

        {/* ── Vibe picker ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {VIBES.map(v => {
            const Icon = VIBE_ICONS[v.icon] ?? Sparkles;
            const on = vibe === v.key;
            return (
              <button key={v.key} onClick={() => setVibe(on ? "" : v.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "15px 14px",
                  borderRadius: "var(--r)", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13.5, fontWeight: 600, textAlign: "left",
                  background: on ? "var(--grad)" : "var(--surface)",
                  color: on ? "#fff" : "var(--text2)",
                  border: `1px solid ${on ? "transparent" : "var(--border)"}`,
                  boxShadow: on ? "var(--shadow)" : "none",
                }}>
                <Icon size={16}/>{v.label}
              </button>
            );
          })}
        </div>

        {/* ── Language ── */}
        <section>
          <SectionHeader title="Language" sub="Same story, your tongue" icon={<Globe size={15} color="var(--accent)"/>}/>
          <div className="rail" style={{ gap: 8 }}>
            {["All", ...LANGUAGES].map(l => (
              <button key={l} className="chip" data-active={language === l} onClick={() => setLanguage(l)}>
                {l}
              </button>
            ))}
          </div>
        </section>

        {/* ── Following ── */}
        {!!data?.following.length && (
          <section>
            <SectionHeader title="Following" sub="Latest episodes from your creators"/>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.following.map(row => (
                <div key={row.series._id} className="card"
                  style={{ display: "flex", alignItems: "center", gap: 11, padding: 10 }}>
                  <Cover id={row.series._id} url={row.series.coverImage} size={46} radius={11}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                      {row.series.title}
                    </div>
                    <div className="truncate" style={{ fontSize: 11.5, color: "var(--text3)" }}>
                      {row.creatorName}
                      {row.latestEpisode && ` · Ep ${row.latestEpisode.episodeNumber} · ${row.latestEpisode.title}`}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const e = row.latestEpisode ?? row.series.episodes?.[0];
                      if (e) setEp(e, row.series);
                      else showToast("No episodes yet", "info");
                    }}
                    aria-label="Play"
                    style={{
                      width: 34, height: 34, borderRadius: "50%", border: "none", flex: "none",
                      background: "var(--grad)", color: "#fff", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    <Play size={14} fill="#fff"/>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Creators to follow ── */}
        {!!data?.creators.length && (
          <section>
            <SectionHeader title="Creators to follow"/>
            <div className="rail">
              {data.creators.map(c => (
                <div key={c._id} className="card"
                  style={{ flex: "none", width: 124, padding: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                  <Link href={`/u/${c._id}`}><Avatar name={c.name} image={c.image} size={46}/></Link>
                  <span className="truncate" style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", maxWidth: "100%", textAlign: "center" }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--text3)" }}>
                    {c.followerCount.toLocaleString()} followers
                  </span>
                  <button onClick={() => toggleFollow(c)}
                    className={`btn btn-xs ${c.isFollowing ? "btn-soft" : "btn-primary"}`}
                    style={{ width: "100%" }}>
                    {c.isFollowing ? <><Check size={12}/>Following</> : <><UserPlus size={12}/>Follow</>}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Matched ── */}
        <section>
          <SectionHeader title="Matched for you" sub={`${data?.matched.length ?? 0} shows`}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {loading
              ? [0, 1, 2, 3].map(i => <ShowCardSkeleton key={i} width={150}/>)
              : data?.matched.length
                ? data.matched.map(s => <ShowCard key={s._id} series={s} width={150}/>)
                : <p style={{ fontSize: 12.5, color: "var(--text3)", gridColumn: "1/-1" }}>
                    Nothing matches that combination yet — try another vibe or language.
                  </p>}
          </div>
        </section>
      </Screen>
    </>
  );
}
