"use client";
import { useApp } from "@/store";
import { Theme } from "@/types";
import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const THEMES: { id: string; label: string; dot: string; dark: Theme; light: Theme }[] = [
  { id:"midnight", label:"Midnight", dot:"#7c6af7", dark:"midnight-dark", light:"midnight-light" },
  { id:"forest",   label:"Forest",   dot:"#22c55e", dark:"forest-dark",   light:"forest-light"   },
  { id:"desert",   label:"Desert",   dot:"#f59e0b", dark:"desert-dark",   light:"desert-light"   },
  { id:"ocean",    label:"Ocean",    dot:"#38bdf8", dark:"ocean-dark",    light:"ocean-light"    },
  { id:"rose",     label:"Rose",     dot:"#f43f5e", dark:"rose-dark",     light:"rose-light"     },
  { id:"mono",     label:"Mono",     dot:"#a3a3a3", dark:"mono-dark",     light:"mono-light"     },
];

const DARK_THEMES = THEMES.map(t => t.dark as string);

export default function ThemeSelector({ onClose }: { onClose?: () => void }) {
  const { theme, setTheme } = useApp();
  const isDark = DARK_THEMES.includes(theme);
  const cur = THEMES.find(t => t.dark === theme || t.light === theme) ?? THEMES[0];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const apply = (t: Theme) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    onClose?.();
  };

  const toggleMode = () => apply(isDark ? cur.light : cur.dark);

  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:14, padding:12, minWidth:180 }}>
      <p style={{ fontSize:11, color:"var(--text3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:10 }}>Theme</p>
      {THEMES.map(t => {
        const isActive = theme === t.dark || theme === t.light;
        return (
          <button key={t.id} onClick={() => apply(isDark ? t.dark : t.light)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9, border:"none", background:isActive?"var(--surface2)":"transparent", cursor:"pointer", marginBottom:2 }}>
            <div style={{ width:13, height:13, borderRadius:"50%", background:t.dot, flexShrink:0, border:"2px solid var(--border2)" }}/>
            <span style={{ fontSize:13, color:isActive?"var(--accent)":"var(--text2)", fontWeight:isActive?700:400, flex:1, textAlign:"left" }}>{t.label}</span>
            {isActive && <span style={{ fontSize:11, color:"var(--accent)" }}>✓</span>}
          </button>
        );
      })}
      <button onClick={toggleMode}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:8, padding:"8px", borderRadius:9, border:"1px solid var(--border2)", background:"var(--surface2)", cursor:"pointer", fontSize:12, color:"var(--text2)", fontFamily:"var(--ff-sans)" }}>
        {isDark ? <><Sun size={12} color="#fbbf24"/> Light mode</> : <><Moon size={12}/> Dark mode</>}
      </button>
    </div>
  );
}
// c