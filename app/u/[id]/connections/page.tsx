"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { useApp, useToast } from "@/store";
import { Screen, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";

interface ConnUser { _id: string; name: string; image: string; handle?: string; }

// Instagram-style followers/following list for any account (your own
// or someone else's) — reached by tapping the counts on /u/[id] or on
// your own Profile. useSearchParams (for the initial ?tab=) needs the
// Suspense boundary the App Router requires.
export default function ConnectionsPage() {
  return (
    <Suspense fallback={null}>
      <ConnectionsInner/>
    </Suspense>
  );
}

function ConnectionsInner() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, setUser } = useApp();
  const showToast = useToast(s => s.show);

  const [tab, setTab] = useState<"followers" | "following">(
    searchParams.get("tab") === "following" ? "following" : "followers"
  );
  const [followers, setFollowers] = useState<ConnUser[] | null>(null);
  const [following, setFollowing] = useState<ConnUser[] | null>(null);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/users/${id}/followers`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.followers)) setFollowers(d.followers); })
      .catch(() => {});
    fetch(`/api/users/${id}/following`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.following)) setFollowing(d.following); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const list = tab === "followers" ? followers : following;

  const toggleFollow = async (target: ConnUser) => {
    if (!user) { router.push("/login"); return; }
    if (target._id === user._id) return;
    setBusyId(target._id);
    try {
      const r = await fetch(`/api/users/${user._id}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: target._id }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't update", "error"); return; }
      setUser({ ...user, following: d.following, followRequestsSent: d.followRequestsSent });
      const label = d.status === "requested" ? "Follow request sent"
        : d.status === "following" ? "Followed" : "Unfollowed";
      showToast(label, "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <TopBar title="Connections"/>
      <Screen>
        <div className="rail" style={{ gap: 8 }}>
          <button className="chip" data-active={tab === "followers"} onClick={() => setTab("followers")}>
            Followers{followers ? ` (${followers.length})` : ""}
          </button>
          <button className="chip" data-active={tab === "following"} onClick={() => setTab("following")}>
            Following{following ? ` (${following.length})` : ""}
          </button>
        </div>

        {list === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 14 }}/>)}
          </div>
        ) : list.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map(u => {
              const isSelf = user?._id === u._id;
              const isFollowing = user ? (user.following || []).includes(u._id) : false;
              const isRequested = user ? (user.followRequestsSent || []).includes(u._id) : false;
              return (
                <div key={u._id} className="card" style={{ display: "flex", alignItems: "center", gap: 11, padding: 10 }}>
                  <Link href={`/u/${u._id}`}
                    style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0, textDecoration: "none" }}>
                    <Avatar name={u.name} image={u.image} size={42}/>
                    <span style={{ minWidth: 0 }}>
                      <span className="truncate" style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                        {u.name}
                      </span>
                      {u.handle && (
                        <span className="truncate" style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>
                          @{u.handle}
                        </span>
                      )}
                    </span>
                  </Link>
                  {!isSelf && (
                    <button onClick={() => toggleFollow(u)} disabled={busyId === u._id}
                      className={`btn btn-xs ${isFollowing || isRequested ? "btn-ghost" : "btn-primary"}`}>
                      {isFollowing ? "Following" : isRequested ? "Requested" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Users size={22}/>}
            title={tab === "followers" ? "No followers yet" : "Not following anyone yet"}
            body={tab === "followers"
              ? "When someone follows this account, they'll show up here."
              : "Accounts they follow will show up here."}/>
        )}
      </Screen>
    </>
  );
}
