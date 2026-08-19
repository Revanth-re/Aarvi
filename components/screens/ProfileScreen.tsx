"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic, Pencil, Share2, Plus, MoreHorizontal, Disc3 } from "lucide-react";
import { Series } from "@/types";
import { useApp, useDataCache, cacheKeyFor, useToast } from "@/store";
import { gradientFor } from "@/lib/gamification";
import { Screen, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";
import ProfilePhotoViewer from "./ProfilePhotoViewer";

/* eslint-disable @next/next/no-img-element */

interface ProfileCache { followerCount: number; followingCount: number; posts: Series[]; }

export default function ProfileScreen() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  // Share *this account's* profile — distinct from sharing the app
  // itself (that lives in Settings now, alongside Download, so this
  // header stays a clean Instagram-style profile rather than a mix of
  // app-promotion and profile actions).
  const shareProfile = async () => {
    if (!user) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/u/${user._id}` : "";
    try {
      if (navigator.share) await navigator.share({ title: user.name || "My profile", text: "Follow me on SWARA FM", url });
      else { await navigator.clipboard.writeText(url); showToast("Profile link copied", "success"); }
    } catch { /* dismissed */ }
  };

  const cacheKey = cacheKeyFor("profile", user?._id);
  const cached = useDataCache(s => s.cache[cacheKey]) as ProfileCache | undefined;
  const setCache = useDataCache(s => s.setCache);

  const [followerCount, setFollowerCount] = useState(cached?.followerCount ?? 0);
  const [followingCount, setFollowingCount] = useState(cached?.followingCount ?? 0);
  const [posts, setPosts] = useState<Series[]>(cached?.posts ?? []);
  const [loaded, setLoaded] = useState(!!cached);
  const [photoOpen, setPhotoOpen] = useState(false);
  // Not part of the seeded/cached payload — this is only ever a small
  // badge count, cheap enough to refetch each visit rather than store.
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      fetch(`/api/users/${user._id}`).then(r => r.json()),
      // Plain fetch, not creatorFetch — this "Posts" grid mirrors what a
      // visitor to your public profile actually sees, so drafts stay
      // excluded here the same way they're excluded for everyone else.
      fetch(`/api/series?creatorId=${user._id}&limit=60`).then(r => r.json()),
    ])
      .then(([u, s]) => {
        if (cancelled) return;
        const nextFollowers = !u.error ? (u.followerCount ?? 0) : 0;
        const nextFollowing = !u.error ? (u.followingCount ?? 0) : 0;
        const nextPosts = Array.isArray(s) ? s : [];
        if (!u.error) { setFollowerCount(nextFollowers); setFollowingCount(nextFollowing); }
        setPosts(nextPosts);
        setCache(cacheKey, { followerCount: nextFollowers, followingCount: nextFollowing, posts: nextPosts });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });

    fetch(`/api/users/${user._id}/follow-requests`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.requests)) setRequestCount(d.requests.length); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?._id]);

  if (!user) {
    return (
      <>
        <TopBar title="Profile"/>
        <Screen>
          <EmptyState icon={<Mic size={22}/>} title="You're not logged in"
            body="Log in to track your streak, earn coins and keep your thoughts."
            cta={{ href: "/login", label: "Log in" }}/>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Profile"/>
      <Screen>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <button onClick={() => setPhotoOpen(true)} aria-label="View profile photo"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flex: "none" }}>
            <Avatar name={user.name} image={user.image} size={72}/>
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="truncate" style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
              {user.name || "Listener"}
            </div>
            <div className="truncate" style={{ fontSize: 12.5, color: "var(--text3)" }}>
              {user.handle ? `@${user.handle}` : "@listener"}
            </div>
          </div>
          {/* Share sits up here, next to the identity — the row below
              is purely actions (Edit/Post/Studio/More). */}
          <button onClick={shareProfile} aria-label="Share profile" style={{
            background: "none", border: "none", cursor: "pointer", color: "var(--text2)",
            display: "flex", padding: 6, flex: "none",
          }}>
            <Share2 size={19}/>
          </button>
        </div>

        {user.bio && (
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>{user.bio}</p>
        )}

        <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
          {loaded ? (
            <>
              <span><strong style={{ color: "var(--text)" }}>{posts.length}</strong> <span style={{ color: "var(--text3)" }}>posts</span></span>
              <Link href={`/u/${user._id}/connections?tab=followers`} style={{ textDecoration: "none" }}>
                <strong style={{ color: "var(--text)" }}>{followerCount.toLocaleString()}</strong> <span style={{ color: "var(--text3)" }}>followers</span>
              </Link>
              <Link href={`/u/${user._id}/connections?tab=following`} style={{ textDecoration: "none" }}>
                <strong style={{ color: "var(--text)" }}>{followingCount.toLocaleString()}</strong> <span style={{ color: "var(--text3)" }}>following</span>
              </Link>
            </>
          ) : (
            <div className="skeleton" style={{ height: 16, width: 180, borderRadius: 6 }}/>
          )}
        </div>

        {/* ── Actions: Edit / Post / Studio / More — this account's
             equivalent of the Follow/Message row on someone else's
             profile (see app/u/[id]/page.tsx). ── */}
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/profile/edit" className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}>
            <Pencil size={14}/>Edit
          </Link>
          <Link href="/creator/new" className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}>
            <Plus size={14}/>Post
          </Link>
          <Link href="/creator" className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}>
            <Mic size={14}/>Studio
          </Link>
          <Link href="/profile/more" className="btn btn-soft btn-sm" style={{ padding: "8px 12px", position: "relative", textDecoration: "none" }} aria-label="More">
            <MoreHorizontal size={14}/>
            {requestCount > 0 && (
              <span style={{
                position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%",
                background: "#FF4D6D", border: "1.5px solid var(--surface)",
              }}/>
            )}
          </Link>
        </div>

        {/* ── Posts ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Posts</div>
          {!loaded ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ aspectRatio: "1", borderRadius: 10 }}/>)}
            </div>
          ) : posts.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {posts.map(s => (
                <Link key={s._id} href={`/series/${s._id}`} style={{ display: "block" }}>
                  <div style={{
                    aspectRatio: "1", borderRadius: 10, overflow: "hidden",
                    background: gradientFor(s._id),
                  }}>
                    {s.coverImage && (
                      <img src={s.coverImage} alt={s.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Disc3 size={20}/>} title="No posts yet"
              body="Publish a series from Creator Studio and it'll show up here."/>
          )}
        </div>
      </Screen>

      <ProfilePhotoViewer open={photoOpen} onClose={() => setPhotoOpen(false)} image={user.image} name={user.name}/>
    </>
  );
}
