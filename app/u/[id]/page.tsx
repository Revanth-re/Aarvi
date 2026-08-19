"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useApp, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
import Avatar from "@/components/ui/Avatar";
import { Screen, EmptyState } from "@/components/kit";
import { gradientFor } from "@/lib/gamification";
import TopBar from "@/components/shell/TopBar";
import { UserPlus, UserCheck, Clock, MessageCircle, Disc3, Eye } from "lucide-react";
import { Series } from "@/types";
import ProfilePhotoViewer from "@/components/screens/ProfilePhotoViewer";

/* eslint-disable @next/next/no-img-element */

interface PublicUser {
  _id: string; name: string; handle: string; bio: string; image: string;
  createdAt: string; followerCount: number; followingCount: number; isPrivate: boolean;
}

// The "someone else's profile" screen — Instagram-style header (avatar,
// name/handle, follower/following counts, follow + message buttons)
// with a grid of their published series underneath. Also doubles as
// your own "profile preview" (see ProfileScreen's "Preview profile"
// link) via ?preview=1, which is the only thing that suppresses the
// self-redirect below.
export default function PublicProfilePage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const router = useRouter();
  const { user, setUser } = useApp();
  const showToast = useToast(s => s.show);

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [posts, setPosts] = useState<Series[]>([]);
  const [credited, setCredited] = useState<Series[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const isSelf = !!user && id === user._id;

  useEffect(() => {
    if (!id) return;
    if (isSelf && !preview) { router.replace("/profile"); return; }
    let cancelled = false;

    Promise.all([
      fetch(`/api/users/${id}`).then(r => r.json()),
      fetch(`/api/series?creatorId=${id}&limit=60`).then(r => r.json()),
      fetch(`/api/series?taggedUserId=${id}&limit=60`).then(r => r.json()),
    ]).then(([p, s, c]) => {
      if (cancelled) return;
      if (!p.error) setProfile(p);
      if (Array.isArray(s)) setPosts(s);
      // Credits section is for work they contributed to but don't own
      // outright — drop anything that's already in "posts".
      if (Array.isArray(c)) {
        const ownIds = new Set((Array.isArray(s) ? s : []).map((x: Series) => x._id));
        setCredited(c.filter((x: Series) => !ownIds.has(x._id)));
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [id, user?._id, preview, isSelf]);

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
        {preview && isSelf && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
            borderRadius: 12, background: "color-mix(in srgb, var(--accent) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            fontSize: 12, color: "var(--accent)", fontWeight: 600,
          }}>
            <Eye size={14}/> This is how your profile looks to other people
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setPhotoOpen(true)} aria-label="View profile photo"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flex: "none" }}>
            <Avatar name={profile.name} image={profile.image} size={72}/>
          </button>
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

        {!(preview && isSelf) && (
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
        )}

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

        {!!credited.length && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
              Credits — voice-over &amp; contributions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {credited.map(s => {
                const myCredit = s.credits?.find(c => c.userId === id);
                return (
                  <Link key={s._id} href={`/series/${s._id}`} style={{
                    display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
                  }} className="card">
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, overflow: "hidden", flex: "none",
                      background: gradientFor(s._id),
                    }}>
                      {s.coverImage && (
                        <img src={s.coverImage} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                      )}
                    </div>
                    <span style={{ minWidth: 0 }}>
                      <span className="truncate" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{s.title}</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--text3)" }}>{myCredit?.role || "Contributor"}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </Screen>

      <ProfilePhotoViewer open={photoOpen} onClose={() => setPhotoOpen(false)} image={profile.image} name={profile.name}/>
    </>
  );
}
