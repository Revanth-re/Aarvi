"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Coins, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { CoinTx, CoinPack } from "@/types";
import { useApp, useToast } from "@/store";
import { Screen, SectionHeader } from "./MobileKit";

const REASON_LABEL: Record<string, string> = {
  daily_checkin:  "Daily check-in",
  streak_bonus:   "Streak bonus",
  squad_bonus:    "Squad bonus",
  badge_reward:   "Badge unlocked",
  unlock_episode: "Unlocked episode",
  purchase:       "Coin pack",
  admin_grant:    "Granted by admin",
};

export default function WalletScreen() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [coins, setCoins] = useState(0);
  const [txs, setTxs] = useState<CoinTx[]>([]);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");

  const userId = user?._id;

  // `reload()` bumps a key rather than calling the fetch directly, so
  // every setState stays inside the effect's own async callbacks.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetch(`/api/users/${userId}/wallet`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || d.error) return;
        setCoins(d.coins ?? 0);
        setTxs(d.transactions ?? []);
        setPacks(d.packs ?? []);
        setDemoMode(!!d.demoMode);
      })
      .catch(() => { /* balance stays as-is rather than flashing to zero */ })
      .finally(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; };
  }, [userId, reloadKey]);

  // Derived, so nothing has to setState before the first await.
  const loading = !!userId && !loaded;

  const buy = async (pack: CoinPack) => {
    if (!user) return;
    setBusy(pack.key);
    try {
      const r = await fetch(`/api/users/${user._id}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packKey: pack.key }),
      });
      const d = await r.json();
      if (!r.ok || d.error) {
        // 501 is the expected response until a payment provider is
        // wired up — surface the explanation rather than a generic error.
        showToast(d.detail || d.error || "Purchase failed", "info");
        return;
      }
      setCoins(d.coins);
      showToast(`+${d.granted} coins added`, "success");
      reload();
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy("");
    }
  };

  if (!user) {
    return (
      <Screen>
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
            Log in to see your coins
          </h2>
          <Link href="/login" className="btn btn-primary" style={{ textDecoration: "none" }}>Log in</Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="font-display" style={{ fontSize: 22, fontWeight: 400, color: "var(--text)" }}>
        Wallet
      </div>

      {/* ── Balance ── */}
      <div style={{
        background: "linear-gradient(135deg,var(--accent),var(--accent2))",
        borderRadius: 22, padding: 22, textAlign: "center",
        boxShadow: "0 12px 28px var(--accent)40",
      }}>
        <Coins size={26} color="#fff" style={{ margin: "0 auto 8px", display: "block" }}/>
        <div style={{ fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
          {loading ? "—" : coins.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.85)", marginTop: 4 }}>
          coins available
        </div>
      </div>

      {/* ── How to earn ── */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 14, fontSize: 12.5, color: "var(--text2)",
        lineHeight: 1.7,
      }}>
        <strong style={{ color: "var(--text)" }}>Earning coins:</strong> check in daily
        (more per streak day), unlock badges, and keep your squad&apos;s streak
        alive. Spend them to unlock locked episodes.
      </div>

      {/* ── Coin packs ── */}
      <div>
        <SectionHeader title="Get more coins"/>

        {!demoMode && (
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-start",
            background: "var(--warning)15", border: "1px solid var(--warning)35",
            borderRadius: 12, padding: 12, marginBottom: 12,
            fontSize: 12, color: "var(--text2)", lineHeight: 1.6,
          }}>
            <Info size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }}/>
            <span>
              Payments aren&apos;t connected yet, so these packs can&apos;t be bought.
              Coins are only granted through a verified payment webhook — set
              <code style={{ margin: "0 4px" }}>DEMO_WALLET=true</code>
              to try the flow with test coins.
            </span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {packs.map(p => (
            <button key={p.key} onClick={() => buy(p)} disabled={!!busy}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 16, padding: 14, cursor: "pointer",
                fontFamily: "var(--ff-sans)", textAlign: "left",
              }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flex: "none",
                background: "var(--accent)18", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <Coins size={18} color="var(--accent)"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                  {p.coins.toLocaleString()} coins
                </div>
                {p.bonus && (
                  <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>{p.bonus}</div>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                {busy === p.key ? "…" : `₹${p.price}`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Ledger ── */}
      <div>
        <SectionHeader title="Recent activity"/>
        {txs.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {txs.map(t => {
              const earned = t.amount >= 0;
              return (
                <div key={t._id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "11px 14px",
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 999, flex: "none",
                    background: earned ? "var(--success)18" : "var(--danger)18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {earned
                      ? <ArrowUpRight size={14} color="var(--success)"/>
                      : <ArrowDownRight size={14} color="var(--danger)"/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
                      {REASON_LABEL[t.reason] ?? t.reason}
                    </div>
                    <div className="truncate" style={{ fontSize: 10.5, color: "var(--text3)" }}>
                      {t.note || new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: earned ? "var(--success)" : "var(--danger)",
                  }}>
                    {earned ? "+" : ""}{t.amount}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: "var(--text3)" }}>
            {loading ? "Loading…" : "No coin activity yet — start listening to earn your first check-in bonus."}
          </p>
        )}
      </div>
    </Screen>
  );
}
