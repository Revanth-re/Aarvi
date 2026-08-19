"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, UserCheck, Eye, Settings as Cog, ChevronRight, BarChart3, Archive } from "lucide-react";
import { useApp } from "@/store";
import { Screen } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";

/**
 * Everything that used to crowd the main Profile header's button row
 * now lives here instead — that row is just Edit profile / Post /
 * Studio / Share / More now, Instagram-style.
 */
export default function ProfileMoreScreen() {
  const router = useRouter();
  const user = useApp(s => s.user);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/users/${user._id}/follow-requests`)
      .then(r => r.json())
      .then(d => { if (!cancelled && Array.isArray(d.requests)) setRequestCount(d.requests.length); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?._id]);

  if (!user) return null;

  return (
    <>
      <TopBar title="More"/>
      <Screen>
        <button onClick={() => router.back()} aria-label="Back"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 0 }}>
          <ArrowLeft size={20}/>
        </button>

        <div className="card" style={{ padding: 4 }}>
          <Row href="/messages" icon={<MessageSquare size={16}/>} label="Messages"/>
          <Row href="/profile/requests" icon={<UserCheck size={16}/>} label="Follow requests" badge={requestCount}/>
          <Row href={`/u/${user._id}?preview=1`} icon={<Eye size={16}/>} label="Preview profile"/>
          <Row href="/profile/stats" icon={<BarChart3 size={16}/>} label="Listening stats"/>
          <Row href="/profile/archive" icon={<Archive size={16}/>} label="Your archive"/>
          <Row href="/settings" icon={<Cog size={16}/>} label="Settings" last/>
        </div>
      </Screen>
    </>
  );
}

function Row({
  href, icon, label, badge, last,
}: { href: string; icon: React.ReactNode; label: string; badge?: number; last?: boolean }) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "13px 12px",
      textDecoration: "none", borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--accent)", display: "flex" }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{label}</span>
      {!!badge && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: 9, background: "#FF4D6D",
          color: "#fff", fontSize: 10, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px",
        }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <ChevronRight size={16} color="var(--text3)"/>
    </Link>
  );
}
