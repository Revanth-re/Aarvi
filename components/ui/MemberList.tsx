"use client";
import Link from "next/link";
import Avatar from "./Avatar";
import { MessageCircle, User, Users } from "lucide-react";

export interface RoomMemberView { clientId: string; userId?: string; name: string; image: string; }

interface Props {
  members: RoomMemberView[];
  onOpenDm: (member: RoomMemberView) => void;
  unreadByClientId?: Record<string, number>;
}

// Standalone "who's listening" section — deliberately its own card,
// not squeezed into the room-code/invite-link card. Each row has a
// direct message button (starts a private 1:1 thread with that
// listener) and, for listeners who are real logged-in accounts, a
// "view profile" link.
export default function MemberList({ members, onOpenDm, unreadByClientId = {} }: Props) {
  if (members.length === 0) return null;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Users size={14} color="var(--accent)" />
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: .4 }}>
          Listeners ({members.length})
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {members.map(m => {
          const unread = unreadByClientId[m.clientId] || 0;
          return (
            <div key={m.clientId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderRadius: 8 }}>
              <Avatar name={m.name} image={m.image} size={26} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
              <button
                onClick={() => onOpenDm(m)}
                title={`Message ${m.name}`}
                style={{ position: "relative", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: "1px solid var(--border2)", background: "var(--surface2)", color: "var(--text3)", cursor: "pointer" }}
              >
                <MessageCircle size={13} />
                {unread > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, minWidth: 14, height: 14, padding: "0 3px", borderRadius: "50%", background: "var(--accent2)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {m.userId ? (
                <Link href={`/u/${m.userId}`} title={`View ${m.name}'s profile`}
                  style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: "1px solid var(--border2)", background: "var(--surface2)", color: "var(--text3)" }}>
                  <User size={13} />
                </Link>
              ) : (
                <span title="Guest — no profile" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: "1px solid var(--border)", color: "var(--border2)" }}>
                  <User size={13} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
