"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame, Headphones, Coins, ChevronRight, Star, Check, Users,
  Play, Moon, Crown, Sparkles, Heart, Bookmark, CheckCircle2, Award,
} from "lucide-react";
import { SquadView, BadgeDef } from "@/types";
import { useApp, useToast } from "@/store";
import { useGamification } from "@/lib/useGamification";
import { levelFromSeconds } from "@/lib/gamification";
import Avatar from "@/components/ui/Avatar";
import { Screen, SectionHeader } from "./MobileKit";

// lucide has no dynamic-by-name export, so badge icons resolve through
// this map. Unknown keys fall back to a generic award icon rather than
// crashing the screen.
const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Play, Flame, Moon, Headphones, Crown, Sparkles, Heart, Bookmark, CheckCircle2,
};

export default function MobileProfile() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);
  const { data: game, catalog, refresh } = useGamification();

  const [squad, setSquad] = useState<SquadView | null>(null);
  const [busy, setBusy] = useState(false);

  const userId = user?._id;

  // The fetch is inlined in the effect (rather than calling a shared
  // async helper) so the only setState happens inside a .then callback,
  // well after the effect body has returned.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetch(`/api/squad?userId=${userId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setSquad(d.squad ?? null); })
      .catch(() => { /* decorative — don't surface over playback */ });

    return () => { cancelled = true; };
  }, [userId]);

  // Derived, so logging out clears the squad card without an effect.
  const mySquad = userId ? squad : null;

  const squadAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: user._id, ...extra }),
      });
      const d = await r.json();
      if (d.error) { showToast(d.error, "error"); return; }

      setSquad(d.squad ?? null);
      if (d.bonusPaid) {
        showToast(`🎉 Whole squad checked in — +${d.bonusCoins} coins each`, "success");
        refresh();
      }
      if (d.code) showToast(`Squad created — code ${d.code}`, "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <Screen>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 14, padding: "60px 20px", textAlign: "center",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>You&apos;re not logged in</h2>
          <p style={{ fontSize: 13.5, color: "var(--text3)", maxWidth: 300, lineHeight: 1.6 }}>
            Log in to track your streak, earn coins and keep a squad going.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Log in
          </Link>
        </div>
      </Screen>
    );
  }

  const lvl = levelFromSeconds(game?.listenSeconds ?? 0);
  const earned = new Set(game?.badges ?? []);

  return (
    <Screen>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar name={user.name} image={user.image} size={72}/>
        <div style={{ minWidth: 0 }}>
          <div className="font-display truncate" style={{
            fontSize: 18, fontWeight: 400, color: "var(--text)",
          }}>
            {user.name || "Listener"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            Level {lvl.level} {lvl.title}
          </div>
          {/* Progress toward the next level */}
          <div style={{
            marginTop: 6, height: 4, width: 140, borderRadius: 99,
            background: "var(--border2)",
          }}>
            <div style={{
              width: `${Math.round(lvl.progress * 100)}%`, height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg,var(--accent),var(--accent2))",
            }}/>
          </div>
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
            {lvl.nextLevelHours === null
              ? "Max level"
              : `${lvl.hours}h / ${lvl.nextLevelHours}h to level ${lvl.level + 1}`}
          </div>
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <Stat icon={<Flame size={16} color="var(--warning)"/>}
              value={`${game?.streak ?? 0} ${(game?.streak ?? 0) === 1 ? "day" : "days"}`}
              label="Streak"/>
        <Stat icon={<Headphones size={16} color="var(--accent)"/>}
              value={`${lvl.hours}h`} label="Listened"/>
        <Stat icon={<Coins size={16} color="var(--accent2)"/>}
              value={(game?.coins ?? 0).toLocaleString()} label="Coins" href="/wallet"/>
      </div>

      {/* ── Squad streak ── */}
      <div id="squad">
        <SectionHeader title="Squad streak" icon={<Users size={15} color="var(--accent)"/>}/>

        {mySquad ? (
          <div style={{
            background: "linear-gradient(135deg,var(--accent)12,var(--accent2)18)",
            border: "1px solid var(--accent)25", borderRadius: 18, padding: 14,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 10,
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: "var(--text)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Flame size={14} color="var(--warning)"/>
                {mySquad.name} · Day {mySquad.streak}
              </div>
              <button onClick={() => squadAction("leave")} disabled={busy} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 11, color: "var(--text3)", fontFamily: "var(--ff-sans)",
              }}>
                Leave
              </button>
            </div>

            <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
              Everyone listens {mySquad.goalMinutes} min today or the squad streak
              resets for all of you.
            </div>

            <div className="no-scroll" style={{ display: "flex", gap: 16, overflowX: "auto" }}>
              {mySquad.members.map(m => (
                <div key={m.userId} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, flex: "none",
                }}>
                  <div style={{
                    borderRadius: 999, padding: 2,
                    background: m.checkedIn
                      ? "linear-gradient(135deg,var(--accent),var(--accent2))"
                      : "var(--border2)",
                  }}>
                    <Avatar name={m.name} image={m.image} size={40}/>
                  </div>
                  <span className="truncate" style={{
                    fontSize: 10, color: "var(--text3)", maxWidth: 50,
                  }}>
                    {m.userId === user._id ? "You" : m.name.split(" ")[0]}
                  </span>
                  {m.checkedIn
                    ? <Check size={11} color="var(--success)"/>
                    : <span style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1 }}>—</span>}
                </div>
              ))}
            </div>

            {!mySquad.checkedInToday && (
              <button onClick={() => squadAction("checkin")} disabled={busy}
                className="btn btn-primary btn-sm"
                style={{ width: "100%", marginTop: 14, justifyContent: "center" }}>
                {busy ? "Checking in…" : "Check in for today"}
              </button>
            )}
          </div>
        ) : (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 18, padding: 16,
          }}>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12, lineHeight: 1.6 }}>
              Start a squad and keep a shared streak going. If anyone skips a
              day, it resets for everybody.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => squadAction("create", { name: `${user.name?.split(" ")[0] ?? "My"}'s Squad` })}
                disabled={busy} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                Create squad
              </button>
              <button
                onClick={() => {
                  const code = prompt("Enter your squad's invite code");
                  if (code?.trim()) squadAction("join", { code: code.trim().toUpperCase() });
                }}
                disabled={busy} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                Join with code
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Badges ── */}
      <div>
        <SectionHeader title={`Badges · ${earned.size}/${catalog.length}`} icon={<Star size={15} color="var(--accent2)"/>}/>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {catalog.map(b => <BadgeChip key={b.key} badge={b} earned={earned.has(b.key)}/>)}
          {!catalog.length && [0, 1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 30, width: 110, borderRadius: 999 }}/>
          ))}
        </div>
      </div>

      {/* ── Account links ── */}
      <div>
        <SectionHeader title="Account"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Row href="/profile" label="Edit profile & followers"/>
          <Row href="/wallet" label="Coins & wallet"/>
          <Row href="/premium" label="Aarvi Premium"/>
          <Row href="/cart" label="Cart & orders"/>
          <Row href="/series" label="Browse all series"/>
        </div>
      </div>
    </Screen>
  );
}

function Stat({
  icon, value, label, href,
}: { icon: React.ReactNode; value: string; label: string; href?: string }) {
  const body = (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text3)" }}>{label}</div>
    </>
  );
  const style: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 16, padding: "14px 8px", textAlign: "center",
    textDecoration: "none", display: "block",
  };
  return href ? <Link href={href} style={style}>{body}</Link> : <div style={style}>{body}</div>;
}

function BadgeChip({ badge, earned }: { badge: BadgeDef; earned: boolean }) {
  const Icon = ICONS[badge.icon] ?? Award;
  return (
    <div title={badge.description} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
      background: earned ? "var(--accent)18" : "var(--surface)",
      border: `1px solid ${earned ? "var(--accent)35" : "var(--border)"}`,
      color: earned ? "var(--accent)" : "var(--text3)",
      opacity: earned ? 1 : .55,
    }}>
      <Icon size={13} color={earned ? "var(--accent)" : "var(--text3)"}/>
      {badge.name}
    </div>
  );
}

function Row({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "13px 14px", textDecoration: "none",
      fontSize: 13.5, color: "var(--text)",
    }}>
      {label}
      <ChevronRight size={15} color="var(--text3)"/>
    </Link>
  );
}
