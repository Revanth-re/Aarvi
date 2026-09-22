"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";

interface Claim {
  _id: string; userName: string; userHandle: string;
  packKey: string; amount: number; refNumber: string; createdAt: string;
}

export default function UpiClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    adminFetch("/api/admin/upi-claims").then(r => r.json()).then(d => { if (Array.isArray(d)) setClaims(d); });
  };
  useEffect(load, []);

  const review = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    await adminFetch(`/api/admin/upi-claims/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    setBusy(null);
    load();
  };

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>UPI payment claims</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        Check each reference number against your own UPI app/bank before approving — approving is what credits coins.
      </p>
      {!claims.length && <p>No pending claims.</p>}
      {claims.map(c => (
        <div key={c._id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{c.userName} ({c.userHandle})</strong>
            <span>₹{c.amount}</span>
          </div>
          <div style={{ fontSize: 13, color: "#666", margin: "6px 0" }}>
            Pack: {c.packKey} · {new Date(c.createdAt).toLocaleString()}
            {c.refNumber && <> · Ref: <code>{c.refNumber}</code></>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => review(c._id, "approve")} disabled={busy === c._id}
              style={{ padding: "6px 14px", borderRadius: 8, background: "#16A34A", color: "#fff", border: "none", cursor: "pointer" }}>
              Approve
            </button>
            <button onClick={() => review(c._id, "reject")} disabled={busy === c._id}
              style={{ padding: "6px 14px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", cursor: "pointer" }}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
