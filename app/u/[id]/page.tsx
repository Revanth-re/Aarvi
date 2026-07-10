"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp, useToast } from "@/store";
import Avatar from "@/components/ui/Avatar";
import { Calendar, UserPlus, UserCheck, Clock } from "lucide-react";

interface PublicUser {
  _id: string; name: string; image: string; createdAt: string;
  followerCount: number; followingCount: number;
}

export default function PublicProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, setUser } = useApp();
  const showToast = useToast(s => s.show);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (user && id === user._id) { router.replace("/profile"); return; }
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setProfile(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, user]);

  const isFollowing = user ? (user.following || []).includes(id) : false;
  const isRequested = user ? (user.followRequestsSent || []).includes(id) : false;

  const toggleFollow = async () => {
    if (!user) { router.push("/login"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { showToast(data.error || "Couldn't update follow", "error"); return; }
      setUser({ ...user, following: data.following, followRequestsSent: data.followRequestsSent });
      if (data.status === "requested") showToast("Follow request sent", "success");
      else if (isFollowing) showToast("Unfollowed", "success");
      else showToast("Request cancelled", "info");
    } catch { showToast("Network error", "error"); }
    finally { setBusy(false); }
  };

  if (loading) return (
    <div className="container-sm" style={{ paddingTop: 60 }}>
      <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
    </div>
  );
  if (!profile) return <div style={{ textAlign: "center", padding: "100px 24px", color: "var(--text3)" }}>User not found.</div>;

  return (
    <div className="container-sm" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <Avatar name={profile.name} image={profile.image} size={68} />
        <div style={{ minWidth: 200, flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{profile.name}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>
            {profile.createdAt && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar size={13} />Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <span><strong style={{ color: "var(--text)" }}>{profile.followerCount}</strong> <span style={{ color: "var(--text3)" }}>followers</span></span>
            <span><strong style={{ color: "var(--text)" }}>{profile.followingCount}</strong> <span style={{ color: "var(--text3)" }}>following</span></span>
          </div>
        </div>
        <button className={`btn btn-sm ${isFollowing || isRequested ? "btn-ghost" : "btn-primary"}`} onClick={toggleFollow} disabled={busy}>
          {isFollowing ? <><UserCheck size={14} />Following</> : isRequested ? <><Clock size={14} />Requested</> : <><UserPlus size={14} />Follow</>}
        </button>
      </div>
    </div>
  );
}
