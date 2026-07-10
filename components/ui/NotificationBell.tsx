"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useApp } from "@/store";
import { Notification } from "@/types";
import { getPusherClient } from "@/lib/pusherClient";

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useApp();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    fetch(`/api/users/${user._id}/notifications`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.notifications)) setItems(d.notifications); })
      .catch(() => {});
  }, [user?._id]);

  useEffect(() => {
    if (!user) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`user-${user._id}`);
    channel.bind("notification", (data: Notification) => {
      setItems(prev => [data, ...prev]);
    });
    return () => { pusher.unsubscribe(`user-${user._id}`); };
  }, [user?._id]);

  if (!user) return null;

  const unread = items.filter(n => !n.read).length;

  const openDropdown = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      fetch(`/api/users/${user._id}/notifications/read-all`, { method: "POST" }).catch(() => {});
    }
  };

  const goTo = (n: Notification) => {
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={openDropdown} title="Notifications"
        style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--surface2)", cursor: "pointer", position: "relative" }}>
        <Bell size={15} color="var(--text3)" />
        {unread > 0 && (
          <span style={{ position: "absolute", top: -3, right: -3, minWidth: 15, height: 15, padding: "0 3px", borderRadius: "50%", background: "var(--accent2)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
          <div style={{ position: "absolute", right: 0, top: 42, background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 16, width: 300, maxHeight: 360, overflowY: "auto", zIndex: 300, boxShadow: "var(--shadow-lg)" }}>
            <p style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", padding: "12px 14px 8px" }}>Notifications</p>
            {items.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text3)", padding: "20px 14px", textAlign: "center" }}>Nothing yet.</p>
            ) : (
              items.map(n => (
                <button key={n._id} onClick={() => goTo(n)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderTop: "1px solid var(--border)", cursor: n.link ? "pointer" : "default" }}>
                  <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 3 }}>{n.message}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>
                    {new Date(n.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
