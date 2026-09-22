"use client";
import { useCallback, useEffect, useState } from "react";
import { PlayCircle, Gift, Users, Flame, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { WalletState } from "@/types";
import { useApp, useToast } from "@/store";
import { timeAgo } from "@/lib/gamification";
import { Screen, EmptyState, Sheet } from "@/components/kit";
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
  // Manual UPI: opens the UPI app with the amount pre-filled, straight
  // to your own VPA — no gateway, no KYC. The claim records itself the
  // moment they tap pay (no reference number needed from them) — you
  // match it against your own bank/UPI app by amount and time, and
  // coins credit only once you approve it at /admin/upi-claims.
  const [pendingPack, setPendingPack] = useState<string | null>(null);

  const payViaUpi = async (packKey: string) => {
    if (!user) { showToast("Log in first", "info"); return; }
    const pack = w?.packs.find(p => p.key === packKey);
    if (!pack) return;
    const vpa = process.env.NEXT_PUBLIC_UPI_VPA || "";
    const payee = process.env.NEXT_PUBLIC_UPI_PAYEE_NAME || "SWARA FM";
    if (!vpa || vpa === "yourvpa@bank") {
      showToast("UPI ID isn't set up yet — add NEXT_PUBLIC_UPI_VPA", "error");
      return;
    }
    try {
      await fetch("/api/coins/upi/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, packKey }),
      });
    } catch { /* still let them pay even if recording the claim fails */ }

    setPendingPack(packKey);
    const url = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${pack.price}&cu=INR&tn=${encodeURIComponent(`${pack.key} coins`)}`;
    window.location.assign(url);
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
    setBusy("ad");
    setAdLeft(8);
  };
  const [adLeft, setAdLeft] = useState(0);
  useEffect(() => {
    if (adLeft <= 0) return;
    const t = setTimeout(() => {
      if (adLeft === 1) act("ad", {}, "thanks for watching");
      setAdLeft(adLeft - 1);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adLeft]);
  const IG_URL = "https://www.instagram.com/rare_unique_sence_girl_/";
  const adOverlay = adLeft > 0 && (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "linear-gradient(160deg,#feda75,#fa7e1e 30%,#d62976 60%,#962fbf 85%,#4f5bd5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#fff", textAlign: "center", padding: 24 }}>
      <span style={{ position: "absolute", top: "calc(16px + env(safe-area-inset-top, 0px))", right: 16, background: "rgba(0,0,0,.35)", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 700 }}>Reward in {adLeft}s</span>
      <div style={{ width: 96, height: 96, borderRadius: 28, border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>📸</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>@rare_unique_sence_girl_</div>
      <div style={{ fontSize: 14, opacity: .9, maxWidth: 280 }}>Follow us on Instagram for updates, new stories & more ✨</div>
      <a href={IG_URL} target="_blank" rel="noopener noreferrer" style={{ background: "#fff", color: "#d62976", fontWeight: 800, padding: "12px 28px", borderRadius: 999, textDecoration: "none" }}>Follow on Instagram</a>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 4, background: "#fff", width: `${((8 - adLeft) / 8) * 100}%`, transition: "width 1s linear" }}/>
    </div>
  );

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
      {adOverlay}
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
              <button key={p.key} onClick={() => payViaUpi(p.key)}
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

      <Sheet open={!!pendingPack} onClose={() => setPendingPack(null)} title="Payment initiated">
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginTop: 0 }}>
          If your UPI app didn&apos;t open automatically — that only works
          on a phone with GPay/PhonePe installed, not on desktop — pay
          manually using these details from your phone:
        </p>
        <div className="card" style={{ padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: "var(--text3)" }}>UPI ID</span>
            <strong style={{ color: "var(--text)" }}>{process.env.NEXT_PUBLIC_UPI_VPA}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text3)" }}>Amount</span>
            <strong style={{ color: "var(--text)" }}>₹{w?.packs.find(p => p.key === pendingPack)?.price}</strong>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text3)", lineHeight: 1.6 }}>
          Once you&apos;ve paid, just wait a few minutes — we&apos;ll verify it and
          your coins credit automatically to your account.
        </p>
        <button onClick={() => setPendingPack(null)} className="btn btn-primary" style={{ width: "100%" }}>
          Got it
        </button>
      </Sheet>
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
