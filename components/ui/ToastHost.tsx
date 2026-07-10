"use client";
import { useToast } from "@/store";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export default function ToastHost() {
  const toasts  = useToast(s => s.toasts);
  const dismiss = useToast(s => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: 92, left: "50%", transform: "translateX(-50%)",
      zIndex: 800, display: "flex", flexDirection: "column", gap: 8,
      alignItems: "center", width: "100%", padding: "0 16px",
    }}>
      {toasts.map(t => (
        <div key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--surface)",
            border: `1px solid ${t.type === "error" ? "var(--danger)" : t.type === "success" ? "var(--success)" : "var(--border2)"}`,
            borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "var(--text)",
            boxShadow: "var(--shadow-lg)", animation: "fadeUp .2s ease-out both",
            cursor: "pointer", maxWidth: 420, pointerEvents: "auto",
          }}>
          {t.type === "success" && <CheckCircle2 size={15} color="var(--success)" style={{ flexShrink: 0 }}/>}
          {t.type === "error"   && <XCircle size={15} color="var(--danger)" style={{ flexShrink: 0 }}/>}
          {t.type === "info"    && <Info size={15} color="var(--text3)" style={{ flexShrink: 0 }}/>}
          <span style={{ flex: 1 }}>{t.message}</span>
          <X size={13} color="var(--text3)" style={{ flexShrink: 0 }}/>
        </div>
      ))}
    </div>
  );
}
