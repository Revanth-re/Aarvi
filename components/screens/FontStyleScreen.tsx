"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { FontStyle, FONT_STYLES } from "@/types";
import { useApp } from "@/store";
import { Screen } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";

// Inline font-family stacks matching the data-font rules in
// globals.css — used here so each preview card renders in its own
// font regardless of which one is currently applied app-wide.
const STACKS: Record<FontStyle, string> = {
  sora:        "'Sora', system-ui, -apple-system, sans-serif",
  neo:         "'Space Grotesk', system-ui, -apple-system, sans-serif",
  slab:        "'Roboto Slab', Georgia, serif",
  rounded:     "'Baloo 2', system-ui, -apple-system, sans-serif",
  serif:       "'Lora', Georgia, serif",
  playful:     "'Fredoka', system-ui, -apple-system, sans-serif",
  handwritten: "'Caveat', cursive, system-ui, sans-serif",
  retro:       "'Righteous', system-ui, -apple-system, sans-serif",
};

export default function FontStyleScreen() {
  const router = useRouter();
  const fontStyle = useApp(s => s.settings.fontStyle);
  const setFontStyle = useApp(s => s.setFontStyle);

  return (
    <>
      <TopBar title="Font Style"/>
      <Screen>
        <button onClick={() => router.back()} aria-label="Back"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 0 }}>
          <ArrowLeft size={20}/>
        </button>

        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>
            Font style
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>
            Applies to headings, labels, buttons and navigation across the app.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FONT_STYLES.map(({ key, label, sub, preview }) => {
            const on = fontStyle === key;
            return (
              <button key={key} onClick={() => setFontStyle(key)}
                className="card"
                style={{
                  padding: 16, cursor: "pointer", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 10,
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  background: on ? "var(--surface2)" : "var(--surface)",
                  position: "relative",
                }}>
                {on && (
                  <span style={{
                    position: "absolute", top: 10, right: 10, width: 20, height: 20,
                    borderRadius: "50%", background: "var(--grad)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={12} color="#fff" strokeWidth={3}/>
                  </span>
                )}
                <span style={{ fontFamily: STACKS[key], fontSize: 34, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
                  {preview}
                </span>
                <span>
                  <span style={{ display: "block", fontFamily: STACKS[key], fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>
                    {label}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                    {sub}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Screen>
    </>
  );
}
