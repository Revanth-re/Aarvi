"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
import Avatar from "@/components/ui/Avatar";
import { Screen, EmptyState } from "@/components/kit";
import { gradientFor } from "@/lib/gamification";
import TopBar from "@/components/shell/TopBar";
import { UserPlus, UserCheck, Clock, MessageCircle, Disc3 } from "lucide-react";
import { Series } from "@/types";

/* eslint-disable @next/next/no-img-element */

interface PublicUser {
  _id: string; name: string; handle: string; bio: string; image: string;
  createdAt: string; followerCount: number; followingCount: number; isPrivate: boolean;
}

// The "someone else's profile" screen — Instagram-style header (avatar,
// name/handle, follower/following counts, follow + message buttons)
// with a grid of their published series underneath.
export default function PublicProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, setUser } = useApp();
  const showToast = useToast(s => s.show);

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [posts, setPosts] = useState<Series[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (user && id === user._id) { router.replace("/profile"); return; }
    let cancelled = false;

    Promise.all([
      fetch(`/api/users/${id}`).then(r => r.json()),
      fetch(`/api/series?creatorId=${id}&limit=60`).then(r => r.json()),
    ]).then(([p, s]) => {
      if (cancelled) return;
      if (!p.error) setProfile(p);
      if (Array.isArray(s)) setPosts(s);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [id, user?._id]);

  const isFollowing = user ? (user.following || []).includes(id) : false;
  const isRequested = user ? (user.followRequestsSent || []).includes(id) : false;

  const toggleFollow = async () => {
    if (!user) { router.push("/login"); return; }
    setBusy(true);
    try {
      const res = await creatorFetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't update follow", "error"); return; }
      setUser({ ...user, following: data.following, followRequestsSent: data.followRequestsSent });
      if (data.status === "requested") showToast("Follow request sent", "success");
      else if (data.status === "following") showToast("Followed", "success");
      else if (isFollowing) showToast("Unfollowed", "success");
      else showToast("Request cancelled", "info");
    } catch { showToast("Network error", "error"); }
    finally { setBusy(false); }
  };

  const message = async () => {
    if (!user) { router.push("/login"); return; }
    setMessaging(true);
    try {
      // Starting a thread doesn't need a first message here — just
      // navigate to the thread and let them type. Messages screen
      // opens a specific conversation via ?with=.
      router.push(`/messages?with=${id}`);
    } finally { setMessaging(false); }
  };

  if (!loaded) return (
    <>
      <TopBar title="Profile"/>
      <Screen>
        <div className="skeleton" style={{ height: 120, borderRadius: 18 }}/>
      </Screen>
    </>
  );
  if (!profile) return (
    <>
      <TopBar title="Profile"/>
      <Screen>
        <EmptyState icon={<Disc3 size={22}/>} title="User not found" body="This account may have been deleted."/>
      </Screen>
    </>
  );

  return (
    <>
      <TopBar title={profile.name}/>
      <Screen>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={profile.name} image={profile.image} size={72}/>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="truncate" style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{profile.name}</div>
            {profile.handle && (
              <div className="truncate" style={{ fontSize: 12.5, color: "var(--text3)" }}>@{profile.handle}</div>
            )}
          </div>
        </div>

        {profile.bio && (
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>{profile.bio}</p>
        )}

        <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
          <span><strong style={{ color: "var(--text)" }}>{posts.length}</strong> <span style={{ color: "var(--text3)" }}>posts</span></span>
          <Link href={`/u/${id}/connections?tab=followers`} style={{ textDecoration: "none" }}>
            <strong style={{ color: "var(--text)" }}>{profile.followerCount}</strong> <span style={{ color: "var(--text3)" }}>followers</span>
          </Link>
          <Link href={`/u/${id}/connections?tab=following`} style={{ textDecoration: "none" }}>
            <strong style={{ color: "var(--text)" }}>{profile.followingCount}</strong> <span style={{ color: "var(--text3)" }}>following</span>
          </Link>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`btn btn-sm ${isFollowing || isRequested ? "btn-ghost" : "btn-primary"}`}
            onClick={toggleFollow} disabled={busy} style={{ flex: 1, justifyContent: "center" }}>
            {isFollowing ? <><UserCheck size={14}/>Following</> : isRequested ? <><Clock size={14}/>Requested</> : <><UserPlus size={14}/>Follow</>}
          </button>
          <button className="btn btn-soft btn-sm" onClick={message} disabled={messaging} style={{ flex: 1, justifyContent: "center" }}>
            <MessageCircle size={14}/>Message
          </button>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Posts</div>
          {posts.length ? (
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
              body={`${profile.name.split(" ")[0]} hasn't published a series yet.`}/>
          )}
        </div>
      </Screen>
    </>
  );
}
