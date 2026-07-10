"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp, useToast } from "@/store";
import { Series } from "@/types";
import { Heart, ListMusic, Trash2, Plus, ChevronDown, ChevronUp, X, Calendar, Mail, Link2, Users, Check, UserX } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { getPusherClient } from "@/lib/pusherClient";

interface PersonCard { _id: string; name: string; image: string; }

type Tab = "following" | "followers" | "requests";

function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useApp();
  const showToast = useToast(s => s.show);
  const [mounted, setMounted] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>(() => (searchParams.get("tab") === "requests" ? "requests" : "following"));
  const [followingList, setFollowingList] = useState<PersonCard[]>([]);
  const [followersList, setFollowersList] = useState<PersonCard[]>([]);
  const [requestsList, setRequestsList] = useState<PersonCard[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !user) router.replace("/login"); }, [mounted, user, router]);

  useEffect(() => {
    fetch("/api/series?limit=200")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSeriesList(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Fetches all three People lists independently. This used to use
  // Promise.all, which meant if EVEN ONE of the three endpoints failed
  // (a 404 from a route that didn't get deployed, a transient network
  // blip, etc.) the whole thing rejected and ALL THREE lists silently
  // stayed empty — including Requests — with no visible error
  // anywhere. Each fetch below now fails independently and logs to
  // the console instead of getting swallowed, so a real problem shows
  // up as a console error instead of just looking like "no requests".
  const loadPeople = async () => {
    if (!user) return;
    setPeopleLoading(true);
    const fetchList = async (url: string, key: string): Promise<PersonCard[]> => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`[profile] ${url} returned HTTP ${res.status}`);
          return [];
        }
        const data = await res.json();
        if (data.error) {
          console.error(`[profile] ${url} error:`, data.error);
          return [];
        }
        return data[key] || [];
      } catch (err) {
        console.error(`[profile] ${url} failed:`, err);
        return [];
      }
    };
    try {
      const [following, followers, requests] = await Promise.all([
        fetchList(`/api/users/${user._id}/following`, "following"),
        fetchList(`/api/users/${user._id}/followers`, "followers"),
        fetchList(`/api/users/${user._id}/follow-requests`, "requests"),
      ]);
      setFollowingList(following);
      setFollowersList(followers);
      setRequestsList(requests);
    } finally {
      setPeopleLoading(false);
    }
  };

  useEffect(() => { loadPeople(); }, [user?._id, user?.following, user?.followRequestsReceived]);

  // Live refresh: if this tab is already open when someone sends,
  // accepts, or declines a follow request, the notification arrives
  // over Pusher on our personal channel — re-pull the People lists
  // right then instead of waiting for a navigation/reload to notice.
  useEffect(() => {
    if (!user?._id) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`user-${user._id}`);
    const handler = (data: { type?: string }) => {
      if (data?.type === "follow_request" || data?.type === "follow_accept" || data?.type === "follow_decline") {
        loadPeople();
      }
    };
    channel.bind("notification", handler);
    return () => {
      channel.unbind("notification", handler);
      pusher.unsubscribe(`user-${user._id}`);
    };
  }, [user?._id]);

  const seriesMap = useMemo(
    () => Object.fromEntries(seriesList.map(s => [s._id, s])),
    [seriesList]
  );

  if (!mounted || !user) {
    return <div className="container-sm" style={{ paddingTop: 60 }}><div className="skeleton" style={{ height: 120, borderRadius: 16 }} /></div>;
  }

  const favorites = (user.favorites || []).map(id => seriesMap[id]).filter(Boolean) as Series[];
  const playlists = user.playlists || [];

  const copyProfileLink = async () => {
    const link = `${window.location.origin}/u/${user._id}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Profile link copied", "success");
    } catch { showToast("Couldn't copy link", "error"); }
  };

  const respondToRequest = async (requesterId: string, action: "accept" | "decline") => {
    setBusy(`req-${requesterId}`);
    try {
      const res = await fetch(`/api/users/${user._id}/follow-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId, action }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't update request", "error"); return; }
      setUser({ ...user, followRequestsReceived: data.followRequestsReceived });
      setRequestsList(list => list.filter(r => r._id !== requesterId));
      if (action === "accept") {
        showToast("Request accepted", "success");
        setFollowersList(list => {
          const person = requestsList.find(r => r._id === requesterId);
          return person ? [...list, person] : list;
        });
      } else {
        showToast("Request declined", "info");
      }
    } catch { showToast("Network error", "error"); }
    finally { setBusy(null); }
  };

  // "Follow back" — used from the Requests tab, sends a normal request
  // toward the person who just requested to follow you.
  const followBack = async (targetId: string) => {
    setBusy(`fb-${targetId}`);
    try {
      const res = await fetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't send request", "error"); return; }
      setUser({ ...user, following: data.following, followRequestsSent: data.followRequestsSent });
      showToast(data.status === "requested" ? "Follow request sent" : "Unfollowed", "success");
    } catch { showToast("Network error", "error"); }
    finally { setBusy(null); }
  };

  const unfollow = async (targetId: string) => {
    setBusy(`uf-${targetId}`);
    try {
      const res = await fetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't unfollow", "error"); return; }
      setUser({ ...user, following: data.following, followRequestsSent: data.followRequestsSent });
      setFollowingList(list => list.filter(f => f._id !== targetId));
      showToast("Unfollowed", "success");
    } catch { showToast("Network error", "error"); }
    finally { setBusy(null); }
  };

  const removeFavorite = async (seriesId: string) => {
    setBusy(`fav-${seriesId}`);
    try {
      const res = await fetch(`/api/users/${user._id}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't update favorites", "error"); return; }
      setUser({ ...user, favorites: data.favorites });
      showToast("Removed from favorites", "success");
    } catch { showToast("Network error — couldn't update favorites", "error"); }
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
      if (!res.ok || data.error) { showToast(data.error || "Couldn't create playlist", "error"); return; }
      setUser({ ...user, playlists: data.playlists });
      setNewPlaylistName("");
      showToast("Playlist created", "success");
    } catch { showToast("Network error — couldn't create playlist", "error"); }
    finally { setCreating(false); }
  };

  const deletePlaylist = async (playlistId: string, name: string) => {
    if (!confirm(`Delete playlist "${name}"? This cannot be undone.`)) return;
    setBusy(`del-${playlistId}`);
    try {
      const res = await fetch(`/api/users/${user._id}/playlists/${playlistId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't delete playlist", "error"); return; }
      setUser({ ...user, playlists: data.playlists });
      showToast(`Playlist "${name}" deleted`, "success");
    } catch { showToast("Network error — couldn't delete playlist", "error"); }
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
      if (!res.ok || data.error) { showToast(data.error || "Couldn't update playlist", "error"); return; }
      setUser({ ...user, playlists: data.playlists });
      showToast("Removed from playlist", "success");
    } catch { showToast("Network error — couldn't update playlist", "error"); }
    finally { setBusy(null); }
  };

  const activeList = tab === "following" ? followingList : tab === "followers" ? followersList : requestsList;

  return (
    <div className="container-sm" style={{ paddingTop: 40, paddingBottom: 60 }}>

      {/* Profile header */}
      <div className="card" style={{ padding: 24, marginBottom: 28, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <Avatar name={user.name} image={user.image} size={68} />
        <div style={{ minWidth: 200, flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{user.name || "Listener"}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--text3)" }}>
            {user.email && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mail size={13} />{user.email}</span>}
            {user.createdAt && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} />Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={copyProfileLink} title="Share your profile so friends can follow you">
          <Link2 size={13} />Copy profile link
        </button>
      </div>

      {/* Following / Followers / Requests */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Users size={16} color="var(--accent)" />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>People</h2>
        </div>

        {/* Segmented tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "var(--surface2)", padding: 4, borderRadius: 10, width: "fit-content" }}>
          {([
            ["following", `Following (${followingList.length})`],
            ["followers", `Followers (${followersList.length})`],
            ["requests", `Requests${requestsList.length > 0 ? ` (${requestsList.length})` : ""}`],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="btn btn-xs"
              style={{
                background: tab === key ? "var(--accent)" : "transparent",
                color: tab === key ? "#fff" : "var(--text2)",
                border: "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {peopleLoading ? (
          <div className="card" style={{ padding: "20px", textAlign: "center" }}>
            <p style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</p>
          </div>
        ) : activeList.length === 0 ? (
          <div className="card" style={{ padding: "20px", textAlign: "center" }}>
            <p style={{ color: "var(--text3)", fontSize: 13 }}>
              {tab === "following" && "Not following anyone yet. Share your profile link and send follow requests to see where friends left off."}
              {tab === "followers" && "No followers yet. Share your profile link so people can find and follow you."}
              {tab === "requests" && "No pending follow requests."}
            </p>
          </div>
        ) : tab === "requests" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requestsList.map(r => (
              <div key={r._id} className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                <Link href={`/u/${r._id}`} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textDecoration: "none" }}>
                  <Avatar name={r.name} image={r.image} size={32} />
                  <span style={{ fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                </Link>
                <button className="btn btn-primary btn-xs" disabled={busy === `req-${r._id}`} onClick={() => respondToRequest(r._id, "accept")}>
                  <Check size={12} />Accept
                </button>
                <button className="btn btn-ghost btn-xs" disabled={busy === `req-${r._id}`} onClick={() => respondToRequest(r._id, "decline")}>
                  <UserX size={12} />Decline
                </button>
                <button className="btn btn-ghost btn-xs" disabled={busy === `fb-${r._id}`} onClick={() => followBack(r._id)} title="Follow them back too">
                  Follow back
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {activeList.map(f => (
              <div key={f._id} className="card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
                <Link href={`/u/${f._id}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                  <Avatar name={f.name} image={f.image} size={22} />
                  <span style={{ fontSize: 13, color: "var(--text2)" }}>{f.name}</span>
                </Link>
                {tab === "following" && (
                  <button
                    onClick={() => unfollow(f._id)}
                    disabled={busy === `uf-${f._id}`}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex", padding: 2 }}
                    title="Unfollow"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
            <Plus size={13} />{creating ? "Creating…" : "Create"}
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
    </div>
  );
}
export default ProfilePageClient;
