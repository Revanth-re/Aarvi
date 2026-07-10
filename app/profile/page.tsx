"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/store";
import { Series } from "@/types";
import { UserCircle, Heart, ListMusic, Trash2, Plus, ChevronDown, ChevronUp, X, Calendar, Mail } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useApp();
  const [mounted, setMounted] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !user) router.replace("/login"); }, [mounted, user, router]);

  useEffect(() => {
    fetch("/api/series?limit=200")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSeriesList(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const seriesMap = useMemo(
    () => Object.fromEntries(seriesList.map(s => [s._id, s])),
    [seriesList]
  );

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  if (!mounted || !user) {
    return <div className="container-sm" style={{ paddingTop: 60 }}><div className="skeleton" style={{ height: 120, borderRadius: 16 }} /></div>;
  }

  const favorites = (user.favorites || []).map(id => seriesMap[id]).filter(Boolean) as Series[];
  const playlists = user.playlists || [];

  const removeFavorite = async (seriesId: string) => {
    setBusy(`fav-${seriesId}`);
    try {
      const res = await fetch(`/api/users/${user._id}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId }),
      });
      const data = await res.json();
      if (data.favorites) setUser({ ...user, favorites: data.favorites });
    } catch { flashToast("Couldn't update favorites"); }
    finally { setBusy(null); }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/users/${user._id}/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });
      const data = await res.json();
      if (data.playlists) setUser({ ...user, playlists: data.playlists });
      setNewPlaylistName("");
      flashToast("Playlist created");
    } catch { flashToast("Couldn't create playlist"); }
    finally { setCreating(false); }
  };

  const deletePlaylist = async (playlistId: string, name: string) => {
    if (!confirm(`Delete playlist "${name}"?`)) return;
    setBusy(`del-${playlistId}`);
    try {
      const res = await fetch(`/api/users/${user._id}/playlists/${playlistId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.playlists) setUser({ ...user, playlists: data.playlists });
    } catch { flashToast("Couldn't delete playlist"); }
    finally { setBusy(null); }
  };

  const removeItem = async (playlistId: string, seriesId: string, episodeId?: string) => {
    setBusy(`item-${playlistId}-${seriesId}`);
    try {
      const res = await fetch(`/api/users/${user._id}/playlists/${playlistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", seriesId, episodeId }),
      });
      const data = await res.json();
      if (data.playlists) setUser({ ...user, playlists: data.playlists });
    } catch { flashToast("Couldn't update playlist"); }
    finally { setBusy(null); }
  };

  return (
    <div className="container-sm" style={{ paddingTop: 40, paddingBottom: 60 }}>

      {/* Profile header */}
      <div className="card" style={{ padding: 24, marginBottom: 28, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        {user.image
          ? <img src={user.image} alt="" style={{ width: 68, height: 68, borderRadius: "50%", flexShrink: 0 }} />
          : <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <UserCircle size={36} color="var(--text3)" />
            </div>
        }
        <div style={{ minWidth: 200 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{user.name || "Listener"}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--text3)" }}>
            {user.email && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mail size={13} />{user.email}</span>}
            {user.createdAt && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} />Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>}
          </div>
        </div>
      </div>

      {/* Favorites */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Heart size={16} color="var(--accent2)" />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Favorites</h2>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{favorites.length}</span>
        </div>

        {loading ? (
          <div className="grid-cards">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140 }} />)}
          </div>
        ) : favorites.length === 0 ? (
          <div className="card" style={{ padding: "28px 20px", textAlign: "center" }}>
            <p style={{ color: "var(--text3)", fontSize: 13 }}>No favorites yet. Tap the heart on any series to save it here.</p>
          </div>
        ) : (
          <div className="grid-cards">
            {favorites.map(s => (
              <div key={s._id} className="card card-hover" style={{ overflow: "hidden", position: "relative" }}>
                <button
                  onClick={() => removeFavorite(s._id)}
                  disabled={busy === `fav-${s._id}`}
                  title="Remove from favorites"
                  style={{ position: "absolute", top: 8, right: 8, zIndex: 2, background: "rgba(0,0,0,.55)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Heart size={13} color="#fff" fill="#fff" />
                </button>
                <Link href={`/series/${s._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {s.coverImage && <img src={s.coverImage} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} />}
                  <div style={{ padding: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</p>
                    <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.genre}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playlists */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <ListMusic size={16} color="var(--accent)" />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Playlists</h2>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{playlists.length}</span>
        </div>

        {/* Create playlist */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            className="inp" placeholder="New playlist name"
            value={newPlaylistName}
            onChange={e => setNewPlaylistName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") createPlaylist(); }}
          />
          <button className="btn btn-primary btn-sm" onClick={createPlaylist} disabled={creating || !newPlaylistName.trim()}>
            <Plus size={13} />Create
          </button>
        </div>

        {playlists.length === 0 ? (
          <div className="card" style={{ padding: "28px 20px", textAlign: "center" }}>
            <p style={{ color: "var(--text3)", fontSize: 13 }}>No playlists yet. Create one above, or add a series to a playlist from its page.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {playlists.map(p => {
              const isOpen = expanded === p._id;
              return (
                <div key={p._id} className="card" style={{ overflow: "hidden" }}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : p._id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{p.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text3)" }}>{p.items.length} item{p.items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deletePlaylist(p._id, p.name); }}
                      disabled={busy === `del-${p._id}`}
                      className="btn btn-danger btn-xs">
                      <Trash2 size={12} />
                    </button>
                    {isOpen ? <ChevronUp size={16} color="var(--text3)" /> : <ChevronDown size={16} color="var(--text3)" />}
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "8px 12px 12px" }}>
                      {p.items.length === 0 ? (
                        <p style={{ fontSize: 12, color: "var(--text3)", padding: "10px 4px" }}>Empty. Add series from their page.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {p.items.map((item, i) => {
                            const s = seriesMap[item.seriesId];
                            return (
                              <div key={`${item.seriesId}-${item.episodeId || ""}-${i}`}
                                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", borderRadius: 8, background: "var(--surface2)" }}>
                                {s?.coverImage && <img src={s.coverImage} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                                <Link href={s ? `/series/${s._id}` : "#"} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
                                  <p style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s?.title || "Unknown series"}</p>
                                </Link>
                                <button
                                  onClick={() => removeItem(p._id, item.seriesId, item.episodeId)}
                                  disabled={busy === `item-${p._id}-${item.seriesId}`}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 4 }}>
                                  <X size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 18px", fontSize: 13, color: "var(--text)", boxShadow: "var(--shadow-lg)", zIndex: 600 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
