"use client";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { useToast } from "@/store";

export default function ToastHost() {
  const toasts = useToast(s => s.toasts);
  const dismiss = useToast(s => s.dismiss);
  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", left: "50%", transform: "translateX(-50%)",
      bottom: "calc(var(--nav-h) + 88px)", zIndex: 800,
      display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
      width: "100%", maxWidth: 480, padding: "0 16px", pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <button key={t.id} onClick={() => dismiss(t.id)} className="anim-up" style={{
          display: "flex", alignItems: "center", gap: 9,
          background: "var(--surface)",
          border: `1px solid ${t.type === "error" ? "var(--danger)" : t.type === "success" ? "var(--success)" : "var(--border2)"}`,
          borderRadius: "var(--r-pill)", padding: "11px 18px",
          fontSize: 13, color: "var(--text)", boxShadow: "var(--shadow-lg)",
          cursor: "pointer", pointerEvents: "auto", maxWidth: "100%", textAlign: "left",
        }}>
          {t.type === "success" && <CheckCircle2 size={15} color="var(--success)" style={{ flexShrink: 0 }}/>}
          {t.type === "error"   && <XCircle size={15} color="var(--danger)" style={{ flexShrink: 0 }}/>}
          {t.type === "info"    && <Info size={15} color="var(--text3)" style={{ flexShrink: 0 }}/>}
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  );
}
