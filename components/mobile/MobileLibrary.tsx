"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ListMusic, Heart, Library as LibraryIcon } from "lucide-react";
import { Series, Playlist } from "@/types";
import { useApp } from "@/store";
import { gradientFor } from "@/lib/gamification";
import { Screen, Chip } from "./MobileKit";

/* eslint-disable @next/next/no-img-element */

type Tab = "saved" | "playlists" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "saved",     label: "Saved" },
  { key: "playlists", label: "Playlists" },
  { key: "history",   label: "History" },
];

export default function MobileLibrary() {
  const user = useApp(s => s.user);
  const liked = useApp(s => s.liked);

  const [tab, setTab] = useState<Tab>("saved");
  const [saved, setSaved] = useState<Series[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  // Favorites live on the user for logged-in accounts, and in the
  // local zustand `liked` array for guests — same fallback the rest of
  // the app already uses (see MiniPlayer's like handler).
  const favoriteIds = user ? (user.favorites ?? []) : liked;

  const favoriteKey = favoriteIds.join(",");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!favoriteIds.length) { setSaved([]); setLoading(false); return; }

      setLoading(true);
      const list = await Promise.all(
        favoriteIds.map(id => fetch(`/api/series/${id}`).then(r => r.json()).catch(() => null))
      );
      if (cancelled) return;
      setSaved(list.filter((s): s is Series => !!s?._id));
      setLoading(false);
    })();

    return () => { cancelled = true; };
    // favoriteKey (not the array) so this doesn't refire on every
    // render just because a new array instance was created.
  }, [favoriteKey]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetch(`/api/users/${user._id}/playlists`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setPlaylists(Array.isArray(d.playlists) ? d.playlists : []); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?._id]);

  // Derived rather than cleared in an effect, so logging out empties
  // the tab immediately.
  const visiblePlaylists = user ? playlists : [];

  return (
    <Screen>
      <div className="font-display" style={{ fontSize: 22, fontWeight: 400, color: "var(--text)" }}>
        Library
      </div>

      <div className="no-scroll" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {TABS.map(t => (
          <Chip key={t.key} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)}/>
        ))}
      </div>

      {tab === "saved" && (
        loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 84, borderRadius: 16 }}/>)}
          </div>
        ) : saved.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {saved.map(s => <SeriesRow key={s._id} series={s}/>)}
          </div>
        ) : (
          <Empty
            icon={<Heart size={24} color="var(--accent)"/>}
            title="Nothing saved yet"
            body="Tap the heart on any series to keep it here."
            cta={{ href: "/series", label: "Browse series" }}
          />
        )
      )}

      {tab === "playlists" && (
        visiblePlaylists.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visiblePlaylists.map(p => (
              <div key={p._id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 16, padding: 12,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flex: "none",
                  background: gradientFor(p._id), display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <ListMusic size={20} color="#fff"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text3)" }}>
                    {p.items.length} {p.items.length === 1 ? "item" : "items"}
                  </div>
                </div>
                <ChevronRight size={15} color="var(--text3)"/>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={<ListMusic size={24} color="var(--accent)"/>}
            title={user ? "No playlists yet" : "Log in to make playlists"}
            body={user
              ? "Build a playlist from any episode's menu."
              : "Playlists are saved to your account."}
            cta={user ? { href: "/series", label: "Browse series" } : { href: "/login", label: "Log in" }}
          />
        )
      )}

      {tab === "history" && (
        <Empty
          icon={<LibraryIcon size={24} color="var(--accent)"/>}
          title="History isn't recorded yet"
          body={
            "Your app stores per-series playback position (models/Progress.ts) " +
            "but not a time-ordered play log, so there's nothing accurate to " +
            "show here yet. Adding it means writing one row per play — say the " +
            "word and I'll wire it up."
          }
        />
      )}
    </Screen>
  );
}

function SeriesRow({ series }: { series: Series }) {
  return (
    <Link href={`/series/${series._id}`} style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, padding: 10, textDecoration: "none",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 12, overflow: "hidden",
        flex: "none", background: gradientFor(series._id),
      }}>
        {series.coverImage && (
          <img src={series.coverImage} alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          {series.title}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text3)" }}>
          {series.genre} · {series.totalEpisodes || series.episodes?.length || 0} eps
        </div>
      </div>
      <ChevronRight size={15} color="var(--text3)"/>
    </Link>
  );
}

function Empty({
  icon, title, body, cta,
}: {
  icon: React.ReactNode; title: string; body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 12, padding: "48px 20px", textAlign: "center",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: "var(--accent)18",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--text3)", maxWidth: 320, lineHeight: 1.6 }}>{body}</p>
      {cta && (
        <Link href={cta.href} className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
