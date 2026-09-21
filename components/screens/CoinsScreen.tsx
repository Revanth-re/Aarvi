"use client";
import { useCallback, useEffect, useState } from "react";
import { PlayCircle, Gift, Users, Flame, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WalletState } from "@/types";
import { useApp, useToast } from "@/store";
import { timeAgo } from "@/lib/gamification";
import { Screen, EmptyState } from "@/components/kit";
import TopBar, { CoinGlyph } from "@/components/shell/TopBar";

const REASON_LABEL: Record<string, string> = {
  daily_checkin: "Daily reward", streak_bonus: "Streak bonus",
  watch_ad: "Watched an ad", invite_friend: "Friend joined",
  badge_reward: "Badge unlocked", unlock_episode: "Unlocked episode",
  purchase: "Coin pack", admin_grant: "Granted by admin",
};

export default function CoinsScreen() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [w, setW] = useState<WalletState | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/coins?userId=${user._id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && !d.error) { setW(d); setDemoMode(!!d.demoMode); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [user?._id, reloadKey]);

  const act = async (action: string, extra: Record<string, unknown> = {}, label = "") => {
    if (!user) { showToast("Log in first", "info"); return; }
    setBusy(action);
    try {
      const r = await fetch("/api/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, action, ...extra }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.detail || d.error || "Couldn't do that", "info"); return; }
      showToast(`+${d.granted} coins${label ? ` · ${label}` : ""}`, "success");
      reload();
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy("");
    }
  };

  // Loads Razorpay's checkout script once, on demand.
  const loadRazorpay = () => new Promise<boolean>(resolve => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const buyPack = async (packKey: string) => {
    if (!user) { showToast("Log in first", "info"); return; }
    setBusy(`buy-${packKey}`);
    try {
      const ok = await loadRazorpay();
      if (!ok) { showToast("Couldn't load payment gateway", "error"); return; }

      const or = await fetch("/api/coins/razorpay/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packKey }),
      });
      const order = await or.json();
      if (!or.ok || order.error) { showToast(order.error || "Couldn't start payment", "error"); return; }

      interface RazorpaySuccess { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }
      type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };
      const RazorpayCtor = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
      const rzp = new RazorpayCtor({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: "SWARA FM", description: "Coin top-up", order_id: order.orderId,
        prefill: { name: user.name, email: user.email },
        theme: { color: "#8B5CF6" },
        handler: async (resp: RazorpaySuccess) => {
          const vr = await fetch("/api/coins/razorpay/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user._id, packKey,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }),
          });
          const vd = await vr.json();
          if (!vr.ok || vd.error) { showToast(vd.error || "Payment couldn't be verified", "error"); return; }
          showToast(`+${vd.coins} coins added!`, "success");
          reload();
        },
        modal: { ondismiss: () => setBusy("") },
      });
      rzp.open();
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy("");
    }
  };

  // The "ad" is a timed placeholder, not a real ad network. It exists so
  // the reward flow is complete and testable; see the note in the
  // coins API about why this must move behind a server-side reward
  // callback before it earns anything real.
  const watchAd = async () => {
    if ((w?.adsRemainingToday ?? 0) <= 0) {
      showToast("No ads left today — come back tomorrow", "info");
      return;
    }
    showToast("Playing a 30-second ad…", "info");
    setBusy("ad");
    setTimeout(() => act("ad", {}, "thanks for watching"), 1200);
  };

  const invite = async () => {
    const link = `${window.location.origin}/login?ref=${user?._id ?? ""}`;
    try {
      if (navigator.share) await navigator.share({ title: "Join me on SWARA FM", url: link });
      else { await navigator.clipboard.writeText(link); showToast("Invite link copied", "success"); }
    } catch { /* share sheet dismissed — not an error */ }
  };

  if (!user) {
    return (
      <>
        <TopBar title="Coins"/>
        <Screen>
          <EmptyState icon={<CoinGlyph size={22}/>} title="Log in to see your coins"
            body="Coins unlock locked episodes. Earn them with streaks, ads and invites."
            cta={{ href: "/login", label: "Log in" }}/>
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Coins"/>
      <Screen>
        {!loaded ? (
          <>
            <div className="skeleton" style={{ height: 130, borderRadius: "var(--r-lg)" }}/>
            <div className="skeleton" style={{ height: 90, borderRadius: "var(--r-lg)" }}/>
            <div className="skeleton" style={{ height: 90, borderRadius: "var(--r-lg)" }}/>
          </>
        ) : (
        <>
        {/* ── Balance ── */}
        <div style={{
          background: "var(--grad)", borderRadius: "var(--r-lg)", padding: "22px 20px",
          boxShadow: "var(--shadow-lg)",
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.85)" }}>
            YOUR BALANCE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 4px", color: "#fff" }}>
            <CoinGlyph size={30}/>
            <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
              {w ? w.coins.toLocaleString() : "—"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "rgba(255,255,255,.9)" }}>
            <Flame size={13}/> {w?.streak ?? 0}-day streak · +10 bonus daily
          </div>
        </div>

        {/* ── Earn ── */}
        <section>
          <h2 style={sectionH2}>Earn free coins</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <EarnRow
              icon={<PlayCircle size={19}/>}
              title="Watch a short ad"
              sub={`30 seconds → 20 coins · ${w?.adsRemainingToday ?? 0} left today`}
              cta={busy === "ad" ? "…" : "Watch"}
              primary
              disabled={!!busy || (w?.adsRemainingToday ?? 0) <= 0}
              onClick={watchAd}
            />
            <EarnRow
              icon={<Gift size={19}/>}
              title="Claim daily reward"
              sub="+10 coins, resets at midnight"
              cta={w?.dailyClaimed ? "Claimed" : busy === "daily" ? "…" : "Claim"}
              disabled={!!busy || !!w?.dailyClaimed}
              onClick={() => act("daily")}
            />
            <EarnRow
              icon={<Users size={19}/>}
              title="Invite a friend"
              sub="+100 coins when they finish ep 1"
              cta="Invite"
              disabled={false}
              onClick={invite}
            />
          </div>
        </section>

        {/* ── Buy ── */}
        <section>
          <h2 style={sectionH2}>Buy coins</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(w?.packs ?? []).map(p => (
              <button key={p.key} onClick={() => buyPack(p.key)}
                disabled={!!busy} className="card"
                style={{ padding: 14, textAlign: "left", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--coin)" }}>
                  <CoinGlyph size={16}/>
                  <span style={{ fontSize: 19, fontWeight: 800, color: "var(--text)" }}>
                    {p.coins.toLocaleString()}
                  </span>
                </span>
                {p.bonus > 0 && (
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--accent)", fontWeight: 600, marginTop: 2 }}>
                    +{p.bonus} bonus
                  </span>
                )}
                <span style={{
                  display: "inline-block", marginTop: 10, padding: "5px 12px",
                  borderRadius: "var(--r-pill)", background: "var(--grad)",
                  color: "#fff", fontSize: 12.5, fontWeight: 700,
                }}>
                  ₹{p.price}
                </span>
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 14, lineHeight: 1.6 }}>
            Coins unlock locked episodes. Ad rewards are credited by the app itself,
            not by a real ad network — see the note in the code before shipping.
          </p>
        </section>

        {/* ── Ledger ── */}
        {!!w?.transactions.length && (
          <section>
            <h2 style={sectionH2}>Recent activity</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {w.transactions.map(t => {
                const earned = t.amount >= 0;
                return (
                  <div key={t._id} className="card" style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px" }}>
                    <span style={{
                      width: 30, height: 30, borderRadius: "50%", flex: "none",
                      background: earned ? "color-mix(in srgb, var(--success) 16%, transparent)"
                                         : "color-mix(in srgb, var(--danger) 16%, transparent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {earned ? <ArrowUpRight size={14} color="var(--success)"/> : <ArrowDownRight size={14} color="var(--danger)"/>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="truncate" style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                        {REASON_LABEL[t.reason] ?? t.reason}
                      </span>
                      <span className="truncate" style={{ display: "block", fontSize: 10.5, color: "var(--text3)" }}>
                        {t.note || timeAgo(t.createdAt) + " ago"}
                      </span>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: earned ? "var(--success)" : "var(--danger)" }}>
                      {earned ? "+" : ""}{t.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        </>
        )}
      </Screen>
    </>
  );
}

function EarnRow({
  icon, title, sub, cta, onClick, disabled, primary,
}: {
  icon: React.ReactNode; title: string; sub: string; cta: string;
  onClick: () => void; disabled: boolean; primary?: boolean;
}) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
      <span style={{ color: "var(--accent)", flex: "none", display: "flex" }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>{sub}</span>
      </span>
      <button onClick={onClick} disabled={disabled}
        className={`btn btn-sm ${primary ? "btn-primary" : "btn-soft"}`} style={{ flex: "none" }}>
        {cta}
      </button>
    </div>
  );
}

const sectionH2: React.CSSProperties = {
  fontSize: 17, fontWeight: 700, color: "var(--text)", margin: "0 0 12px",
};
