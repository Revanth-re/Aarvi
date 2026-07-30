"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, X, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp, useToast } from "@/store";
import { Screen, EmptyState } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";

interface Requester { _id: string; name: string; image: string; }

// Where the "X wants to follow you" notification links to (see
// app/api/users/[id]/follow — POST). Only reachable/meaningful once an
// account turns on Settings → Privacy → Private account, since a
// public account (the default) auto-accepts follows and never queues
// a request here.
export default function FollowRequestsPage() {
  const router = useRouter();
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [requests, setRequests] = useState<Requester[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!user) { queueMicrotask(() => { if (!cancelled) setLoaded(true); }); return () => { cancelled = true; }; }
    fetch(`/api/users/${user._id}/follow-requests`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.requests)) setRequests(d.requests); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [user?._id]);

  const respond = async (requesterId: string, action: "accept" | "decline") => {
    if (!user) return;
    setBusy(requesterId);
    try {
      const r = await fetch(`/api/users/${user._id}/follow-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId, action }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't update", "error"); return; }
      setRequests(prev => prev.filter(x => x._id !== requesterId));
      showToast(action === "accept" ? "Follow request accepted" : "Request declined", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <TopBar title="Follow requests"/>
      <Screen>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
          <ArrowLeft size={14}/>Back
        </button>

        {!loaded ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[0, 1].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 14 }}/>)}
          </div>
        ) : requests.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requests.map(req => (
              <div key={req._id} className="card" style={{ display: "flex", alignItems: "center", gap: 11, padding: 12 }}>
                <Avatar name={req.name} image={req.image} size={40}/>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: "var(--text)" }} className="truncate">
                  {req.name}
                </span>
                <button onClick={() => respond(req._id, "decline")} disabled={busy === req._id}
                  className="btn btn-ghost btn-xs" aria-label="Decline">
                  <X size={13}/>
                </button>
                <button onClick={() => respond(req._id, "accept")} disabled={busy === req._id}
                  className="btn btn-primary btn-xs" aria-label="Accept">
                  <Check size={13}/>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<UserCheck size={22}/>} title="No pending requests"
            body="When someone asks to follow your private account, they'll show up here."/>
        )}
      </Screen>
    </>
  );
}
