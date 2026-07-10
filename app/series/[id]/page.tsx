"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Series, Episode, FriendProgress } from "@/types";
import { usePlayer, useApp, useToast } from "@/store";
import { Play, Pause, Lock, Heart, Star, Clock, ArrowLeft, Mic, FileText, Globe, Users, ListPlus } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

function fmt(s: number) { return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; }

export default function SeriesDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [series, setSeries] = useState<Series|null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"episodes"|"about"|"transcript">("episodes");
  const [activeEp, setActiveEp] = useState<Episode|null>(null);
  const { ep: curEp, playing, setEp, setPlaying } = usePlayer();
  const { liked, toggleLike, user, setUser } = useApp();
  const showToast = useToast(s => s.show);
  const [friends, setFriends] = useState<FriendProgress[]>([]);

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/series/${id}`).then(r => r.json()).then(d => { setSeries(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!series?._id || !user?._id) { setFriends([]); return; }
    fetch(`/api/series/${series._id}/friends-progress?viewerId=${user._id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.friends)) setFriends(d.friends); })
      .catch(() => {});
  }, [series?._id, user?._id]);

  if (loading) return (
    <div className="container-sm" style={{ paddingTop: 40 }}>
      <div className="skeleton" style={{ height: 300, borderRadius: 16, marginBottom: 24 }}/>
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 8 }}/>)}
    </div>
  );
  if (!series?._id) return <div style={{ textAlign: "center", padding: "100px 24px", color: "var(--text3)" }}>Series not found.</div>;

  // Logged-in users get favorites synced to their account (MongoDB); guests
  // fall back to the old local-only `liked` list in the client store.
  const isLiked = user ? (user.favorites || []).includes(series._id) : liked.includes(series._id);
  const firstFree = series.episodes?.find(e => !e.isLocked);

  const handleToggleLike = async () => {
    if (!user) { toggleLike(series._id); return; }
    try {
      const res = await fetch(`/api/users/${user._id}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: series._id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't update favorites", "error"); return; }
      setUser({ ...user, favorites: data.favorites });
      showToast(data.favorites.includes(series._id) ? "Saved to favorites" : "Removed from favorites", "success");
    } catch { showToast("Network error — couldn't update favorites", "error"); }
  };

  const addToPlaylist = async (playlistId?: string) => {
    if (!user) return;
    setAddingTo(playlistId || "new");
    try {
      if (playlistId) {
        const res = await fetch(`/api/users/${user._id}/playlists/${playlistId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", seriesId: series._id }),
        });
        const data = await res.json();
        if (!res.ok || data.error) { showToast(data.error || "Couldn't add to playlist", "error"); return; }
        setUser({ ...user, playlists: data.playlists });
      } else {
        if (!newPlaylistName.trim()) return;
        const res = await fetch(`/api/users/${user._id}/playlists`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newPlaylistName.trim(), seriesId: series._id }),
        });
        const data = await res.json();
        if (!res.ok || data.error) { showToast(data.error || "Couldn't create playlist", "error"); return; }
        setUser({ ...user, playlists: data.playlists });
        setNewPlaylistName("");
      }
      showToast("Added to playlist", "success");
      setShowPlaylistModal(false);
    } catch { showToast("Network error — couldn't update playlist", "error"); }
    finally { setAddingTo(null); }
  };

  return (
    <div className="container-sm" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <Link href="/series" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13, marginBottom: 24, transition: "color .15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--text3)"}>
        <ArrowLeft size={14}/>Back to Series
      </Link>

      {/* Hero */}
      <div className="card" style={{ overflow: "hidden", marginBottom: friends.length > 0 ? 14 : 24 }}>
        {series.coverImage && (
          <div style={{ height: 200, overflow: "hidden", position: "relative" }}>
            <img src={series.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(1px)", transform: "scale(1.03)", opacity: .25 }}/>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--surface) 35%, transparent)" }}/>
          </div>
        )}
        <div style={{ display: "flex", gap: 20, padding: "24px", marginTop: series.coverImage ? -100 : 0, position: "relative", flexWrap: "wrap" }}>
          <div style={{ width: 130, height: 130, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: "3px solid var(--border2)", boxShadow: "var(--shadow-lg)" }}>
            {series.coverImage ? <img src={series.coverImage} alt={series.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : <div style={{ width: "100%", height: "100%", background: "var(--surface2)" }}/>}
          </div>
          <div style={{ flex: 1, minWidth: 200, paddingTop: series.coverImage ? 36 : 0 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span className="badge badge-accent">{series.genre}</span>
              {series.isTrending && <span className="badge badge-accent2">Trending</span>}
              {series.isFeatured && <span className="badge badge-muted">Featured</span>}
            </div>
            <h1 style={{ fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 700, color: "var(--text)", marginBottom: 10, letterSpacing: "-.02em", lineHeight: 1.2 }}>{series.title}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--text3)", marginBottom: 18 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Star size={13} color="#f59e0b" fill="#f59e0b"/>{series.rating}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={13}/>{(series.totalPlays/1000).toFixed(0)}K plays</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13}/>{series.totalEpisodes} episodes</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Globe size={13}/>{series.language}</span>
              {series.narrator && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mic size={13}/>by {series.narrator}</span>}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {firstFree && (
                <button className="btn btn-primary" onClick={() => setEp(firstFree, series)} style={{ boxShadow: "0 4px 16px var(--accent)30" }}>
                  <Play size={14} fill="currentColor"/>Play Episode 1
                </button>
              )}
              <button className="btn btn-ghost" onClick={handleToggleLike} style={{ color: isLiked ? "var(--accent2)" : "var(--text2)" }}>
                <Heart size={14} fill={isLiked ? "currentColor" : "none"}/>{isLiked ? "Saved" : "Save"}
              </button>
              <button className="btn btn-ghost" onClick={() => user ? setShowPlaylistModal(true) : router.push("/login")}>
                <ListPlus size={14}/>Playlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Friends currently on this series */}
      {friends.length > 0 && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>Friends here</span>
          {friends.map(f => {
            const fEp = series.episodes?.find(e => e._id === f.episodeId);
            return (
              <Link key={f.userId} href={`/u/${f.userId}`} style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
                <Avatar name={f.name} image={f.image} size={22} />
                <span style={{ fontSize: 13, color: "var(--text2)" }}>{f.name} · {fEp ? `Ep ${fEp.episodeNumber}` : "listening"}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "var(--surface)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
        {(["episodes", "about", "transcript"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, textTransform: "capitalize", background: tab===t ? "var(--accent)" : "transparent", color: tab===t ? "#fff" : "var(--text3)", transition: "all .15s" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Episodes */}
      {tab === "episodes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {series.episodes?.map(ep => {
            const isCur = curEp?._id === ep._id;
            return (
              <div key={ep._id} onClick={() => { if (ep.isLocked) return; isCur ? setPlaying(!playing) : setEp(ep, series); setActiveEp(ep); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: ep.isLocked ? "default" : "pointer", background: isCur ? "var(--accent)12" : "var(--surface)", border: `1px solid ${isCur ? "var(--accent)44" : "var(--border)"}`, opacity: ep.isLocked ? .55 : 1, transition: "all .15s" }}
                onMouseEnter={e => { if (!ep.isLocked) (e.currentTarget as HTMLDivElement).style.borderColor = isCur ? "var(--accent)44" : "var(--border2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isCur ? "var(--accent)44" : "var(--border)"; }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: isCur ? "var(--accent)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {ep.isLocked ? <Lock size={13} color="var(--text3)"/> :
                   isCur && playing ? <div className="eq" style={{ height: 14 }}><span style={{height:6}}/><span/><span/><span style={{height:10}}/></div> :
                   isCur ? <Pause size={13} color="#fff" fill="#fff"/> :
                   <span style={{ fontFamily: "var(--ff-mono)", fontSize: 12, color: "var(--text3)" }}>{ep.episodeNumber}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isCur ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ep.title}</span>
                    {ep.isLocked && <span className="badge badge-muted" style={{ fontSize: 10, flexShrink: 0 }}>Premium</span>}
                    {ep.transcript && <FileText size={11} color="var(--text3)" style={{ flexShrink: 0 }}/>}
                  </div>
                  {ep.description && <p style={{ fontSize: 12, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{ep.description}</p>}
                </div>
                <span style={{ fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--text3)", flexShrink: 0 }}>{fmt(ep.duration)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* About */}
      {tab === "about" && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text2)", marginBottom: 24 }}>{series.description}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
            {[["Genre",series.genre],["Language",series.language],["Narrator",series.narrator||"—"],["Episodes",series.totalEpisodes]].map(([k,v])=>(
              <div key={k} style={{ background: "var(--surface2)", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 5 }}>{k}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{v}</p>
              </div>
            ))}
          </div>
          {series.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {series.tags.map(t => <span key={t} className="badge badge-muted">#{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      {tab === "transcript" && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {series.episodes?.filter(e => e.transcript).map(ep => (
              <button key={ep._id} onClick={() => setActiveEp(ep)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${activeEp?._id===ep._id?"var(--accent)":"var(--border2)"}`, background: activeEp?._id===ep._id?"var(--accent)":"var(--surface)", color: activeEp?._id===ep._id?"#fff":"var(--text3)", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
                Ep {ep.episodeNumber}: {ep.title}
              </button>
            ))}
          </div>
          {activeEp?.transcript ? (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 20, fontFamily: "var(--ff-serif)", fontStyle: "italic" }}>{activeEp.title}</h3>
              <div style={{ fontSize: 15, color: "var(--text2)", lineHeight: 2, whiteSpace: "pre-wrap" }}>{activeEp.transcript}</div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <FileText size={32} color="var(--text3)" style={{ margin: "0 auto 12px" }}/>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>Select an episode above to read its transcript.</p>
            </div>
          )}
        </div>
      )}

      {/* Add to Playlist modal */}
      {showPlaylistModal && (
        <div
          onClick={() => setShowPlaylistModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div className="card" style={{ padding: 24, width: "100%", maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Add to Playlist</h3>

            {(user?.playlists?.length ?? 0) > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, maxHeight: 200, overflowY: "auto" }}>
                {user!.playlists!.map(p => (
                  <button key={p._id} className="btn btn-ghost btn-sm" disabled={addingTo === p._id}
                    onClick={() => addToPlaylist(p._id)}
                    style={{ justifyContent: "space-between", width: "100%" }}>
                    <span>{p.name}</span>
                    <span style={{ color: "var(--text3)", fontSize: 12 }}>{p.items.length} item{p.items.length !== 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="inp" placeholder="New playlist name"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addToPlaylist(); }}
              />
              <button className="btn btn-primary btn-sm" disabled={!newPlaylistName.trim() || addingTo === "new"} onClick={() => addToPlaylist()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
