"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Heart, Download, History, MessageCircle } from "lucide-react";
import { Series, Thought } from "@/types";
import { useApp, useDataCache, cacheKeyFor } from "@/store";
import { Screen, Cover, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import ThoughtCard from "./ThoughtCard";

type Tab = "saved" | "downloads" | "history" | "thoughts";

const TABS: { key: Tab; label: string }[] = [
  { key: "saved", label: "Saved" }, { key: "downloads", label: "Downloads" },
  { key: "history", label: "History" }, { key: "thoughts", label: "Thoughts" },
];

export default function LibraryScreen() {
  const user = useApp(s => s.user);
  const liked = useApp(s => s.liked);

  const [tab, setTab] = useState<Tab>("saved");

  // Signed-out visitors keep favourites locally; signed-in ones on the
  // account. Same fallback the rest of the app uses.
  const favoriteIds = user ? (user.favorites ?? []) : liked;
  const favKey = favoriteIds.join(",");

  const setCache = useDataCache(s => s.setCache);
  const savedKey = cacheKeyFor("library-saved", favKey);
  const historyKey = cacheKeyFor("library-history", user?._id);
  const thoughtsKey = cacheKeyFor("library-thoughts", user?._id);
  const cachedSaved = useDataCache(s => s.cache[savedKey]) as Series[] | undefined;
  const cachedHistory = useDataCache(s => s.cache[historyKey]) as { series: Series; percent: number }[] | undefined;
  const cachedThoughts = useDataCache(s => s.cache[thoughtsKey]) as Thought[] | undefined;

  const [saved, setSaved] = useState<Series[]>(cachedSaved ?? []);
  const [history, setHistory] = useState<{ series: Series; percent: number }[]>(cachedHistory ?? []);
  const [thoughts, setThoughts] = useState<Thought[]>(cachedThoughts ?? []);
  const [loading, setLoading] = useState(!cachedSaved);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!favoriteIds.length) { setSaved([]); setCache(savedKey, []); setLoading(false); return; }
      const list = await Promise.all(
        favoriteIds.map(id => fetch(`/api/series/${id}`).then(r => r.json()).catch(() => null))
      );
      if (cancelled) return;
      const rows = list.filter((s): s is Series => !!s?._id);
      setSaved(rows);
      setCache(savedKey, rows);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [favKey]);

  // History reuses the same /api/home payload the Home screen already
  // builds from Progress records, rather than a second source of truth.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/home?userId=${user._id}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || !Array.isArray(d.continue)) return;
        const rows = d.continue.map((c: { series: Series; percent: number }) => ({ series: c.series, percent: c.percent }));
        setHistory(rows);
        setCache(historyKey, rows);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/thoughts?userId=${user._id}&authorId=${user._id}&limit=40`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d)) { setThoughts(d); setCache(thoughtsKey, d); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id]);

  return (
    <>
      <TopBar title="Library"/>
      <Screen>
        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 26, fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Your Library
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--text3)", margin: "4px 0 0" }}>
            {saved.length} {saved.length === 1 ? "show" : "shows"} · 0 offline · {thoughts.length} thoughts saved
          </p>
        </div>

        <div className="rail" style={{ gap: 8 }}>
          {TABS.map(t => (
            <button key={t.key} className="chip" data-active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "saved" && (
          loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1].map(i => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 16 }}/>)}
            </div>
          ) : saved.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {saved.map(s => <SeriesRow key={s._id} series={s}/>)}
            </div>
          ) : (
            <EmptyState icon={<Heart size={22}/>} title="Nothing saved yet"
              body="Tap the heart on any series to keep it here."
              cta={{ href: "/discover", label: "Find something" }}/>
          )
        )}

        {tab === "downloads" && (
          <EmptyState
            icon={<Download size={22}/>}
            title="Downloads aren't built yet"
            body="Your download preferences are saved in Settings, but offline storage itself isn't implemented — audio still streams. This needs a service worker and a cache strategy."
            cta={{ href: "/settings", label: "Open settings" }}
          />
        )}

        {tab === "history" && (
          history.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map(h => <SeriesRow key={h.series._id} series={h.series} percent={h.percent}/>)}
            </div>
          ) : (
            <EmptyState icon={<History size={22}/>} title="No history yet"
              body="Anything you play shows up here with your exact position."/>
          )
        )}

        {tab === "thoughts" && (
          thoughts.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {thoughts.map(t => (
                <ThoughtCard key={t._id} thought={t}
                  onDeleted={id => setThoughts(prev => prev.filter(x => x._id !== id))}/>
              ))}
            </div>
          ) : (
            <EmptyState icon={<MessageCircle size={22}/>} title="No thoughts yet"
              body="Tap “Leave a thought” in the player to pin a note to a moment."/>
          )
        )}
      </Screen>
    </>
  );
}

function SeriesRow({ series, percent }: { series: Series; percent?: number }) {
  return (
    <Link href={`/series/${series._id}`} className="card"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, textDecoration: "none" }}>
      <Cover id={series._id} url={series.coverImage} size={56} radius={12}/>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="truncate" style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
          {series.title}
        </span>
        <span className="truncate" style={{ display: "block", fontSize: 11.5, color: "var(--text3)", marginBottom: percent === undefined ? 0 : 6 }}>
          {series.genre} · {series.totalEpisodes || series.episodes?.length || 0} episodes
        </span>
        {percent !== undefined && (
          <span className="progress-track" style={{ display: "block" }}>
            <span className="progress-fill" style={{ display: "block", width: `${percent}%` }}/>
          </span>
        )}
      </span>
      <ChevronRight size={16} color="var(--text3)" style={{ flex: "none" }}/>
    </Link>
  );
}
