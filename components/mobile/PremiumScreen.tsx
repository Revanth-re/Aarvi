"use client";
import { Check, Crown, Info } from "lucide-react";
import { useToast } from "@/store";
import { Screen } from "./MobileKit";

const PERKS = [
  "Every locked episode unlocked, no coins needed",
  "Ad-free listening across the whole catalog",
  "Offline downloads for the whole series",
  "Early access to new episodes",
  "Double coins on every daily check-in",
  "A Premium badge on your profile",
];

const PLANS = [
  { key: "monthly", label: "Monthly", price: "₹99", per: "/month", note: "" },
  { key: "yearly",  label: "Yearly",  price: "₹799", per: "/year",  note: "Save 33%" },
];

export default function PremiumScreen() {
  const showToast = useToast(s => s.show);

  return (
    <Screen>
      <div style={{
        background: "linear-gradient(135deg,var(--accent),var(--accent2))",
        borderRadius: 22, padding: 24, textAlign: "center",
        boxShadow: "0 12px 28px var(--accent)40",
      }}>
        <Crown size={30} color="#fff" style={{ margin: "0 auto 10px", display: "block" }}/>
        <div className="font-display" style={{ fontSize: 24, fontWeight: 400, color: "#fff" }}>
          Aarvi Premium
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.88)", marginTop: 6, lineHeight: 1.6 }}>
          Every story, no locks, no ads.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PERKS.map(p => (
          <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: 999, flex: "none", marginTop: 1,
              background: "var(--success)20", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Check size={12} color="var(--success)"/>
            </div>
            <span style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.5 }}>{p}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {PLANS.map(plan => (
          <button key={plan.key}
            onClick={() => showToast("Subscriptions aren't connected to a payment provider yet", "info")}
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--border2)",
              borderRadius: 18, padding: 16, cursor: "pointer",
              fontFamily: "var(--ff-sans)", textAlign: "center",
            }}>
            <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>{plan.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>
              {plan.price}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{plan.per}</div>
            {plan.note && (
              <div style={{
                marginTop: 8, fontSize: 10.5, fontWeight: 700, color: "var(--success)",
              }}>
                {plan.note}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Honest about what this screen can and can't do today. */}
      <div style={{
        display: "flex", gap: 8, alignItems: "flex-start",
        background: "var(--warning)15", border: "1px solid var(--warning)35",
        borderRadius: 12, padding: 12, fontSize: 12, color: "var(--text2)", lineHeight: 1.6,
      }}>
        <Info size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }}/>
        <span>
          This screen is the upsell only — no subscription is charged or
          activated. The <code>premiumUntil</code> field exists on the user
          model and every perk above is gated on it, so once a payment
          provider is connected the webhook just needs to set that date.
        </span>
      </div>
    </Screen>
  );
}
