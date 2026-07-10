"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart, useApp } from "@/store";
import { ShoppingBag, Radio, Menu, X, Shield, Sun, Moon, LogIn, LogOut, UserCircle } from "lucide-react";
import { Theme } from "@/types";
import { isAdminEmail } from "@/lib/admin";

const THEMES = [
  { id:"midnight", label:"Midnight", dot:"#7c6af7", dark:"midnight-dark" as Theme, light:"midnight-light" as Theme },
  { id:"forest",   label:"Forest",   dot:"#22c55e", dark:"forest-dark"   as Theme, light:"forest-light"   as Theme },
  { id:"desert",   label:"Desert",   dot:"#f59e0b", dark:"desert-dark"   as Theme, light:"desert-light"   as Theme },
  { id:"ocean",    label:"Ocean",    dot:"#38bdf8", dark:"ocean-dark"    as Theme, light:"ocean-light"    as Theme },
  { id:"rose",     label:"Rose",     dot:"#f43f5e", dark:"rose-dark"     as Theme, light:"rose-light"     as Theme },
  { id:"mono",     label:"Mono",     dot:"#a3a3a3", dark:"mono-dark"     as Theme, light:"mono-light"     as Theme },
];

const DARK_THEMES = THEMES.map(t => t.dark as string);

export default function Navbar() {
  const path   = usePathname();
  const router = useRouter();
  const items  = useCart(s => s.items);
  const cartN  = items.reduce((a, i) => a + i.quantity, 0);
  const { theme, setTheme, user, setUser } = useApp();
  const [open,      setOpen]      = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const admin = isAdminEmail(user?.email);

  if (path.startsWith("/admin")) return null;

  const isDark    = DARK_THEMES.includes(theme);
  const curTheme  = THEMES.find(t => t.dark === theme || t.light === theme) ?? THEMES[0];

  const applyTheme = (t: Theme) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    setThemeOpen(false);
  };

  // Toggle between dark and light of current theme
  const toggleMode = () => {
    applyTheme(isDark ? curTheme.light : curTheme.dark);
  };

  const logout = () => { setUser(null); router.push("/"); };

  const links = [
    { href:"/",       label:"Home"   },
    { href:"/series", label:"Series" },
    { href:"/shop",   label:"Shop"   },
  ];
  const active = (href: string) => href === "/" ? path === "/" : path.startsWith(href);

  return (
    <>
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"var(--bg2)", borderBottom:"1px solid var(--border)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
        <div className="container" style={{ height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>

          {/* Logo */}
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Radio size={16} color="#fff" strokeWidth={2.5}/>
            </div>
            <span style={{ fontFamily:"var(--ff-sans)", fontSize:18, fontWeight:700, color:"var(--text)", letterSpacing:"-.3px" }}>Aarvi</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hide-mobile" style={{ display:"flex", alignItems:"center", gap:4 }}>
            {links.map(l => (
              <Link key={l.href} href={l.href} style={{ padding:"7px 14px", borderRadius:8, textDecoration:"none", fontSize:14, fontWeight:500, color:active(l.href)?"var(--accent)":"var(--text2)", background:active(l.href)?"var(--accent)15":"transparent", transition:"all .15s" }}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>

            {/* Dark/Light toggle */}
            <button onClick={toggleMode} title={isDark ? "Switch to Light" : "Switch to Dark"}
              style={{ width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:8, border:"1px solid var(--border2)", background:"var(--surface2)", cursor:"pointer" }}>
              {isDark ? <Sun size={15} color="#fbbf24"/> : <Moon size={15} color="var(--text3)"/>}
            </button>

            {/* Theme palette picker */}
            <div style={{ position:"relative" }}>
              <button onClick={() => setThemeOpen(!themeOpen)} title="Change theme"
                style={{ width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:8, border:"1px solid var(--border2)", background:"var(--surface2)", cursor:"pointer" }}>
                <div style={{ width:14, height:14, borderRadius:"50%", background:curTheme.dot }}/>
              </button>

              {themeOpen && (
                <div style={{ position:"absolute", right:0, top:42, background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:16, padding:10, width:180, zIndex:300, boxShadow:"var(--shadow-lg)" }}>
                  <p style={{ fontSize:11, color:"var(--text3)", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", padding:"4px 8px 8px" }}>Theme</p>
                  {THEMES.map(t => {
                    const isActive = theme === t.dark || theme === t.light;
                    return (
                      <button key={t.id}
                        onClick={() => applyTheme(isDark ? t.dark : t.light)}
                        style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9, border:"none", background:isActive?"var(--surface2)":"transparent", cursor:"pointer", transition:"background .15s" }}>
                        <div style={{ width:14, height:14, borderRadius:"50%", background:t.dot, flexShrink:0, border:"2px solid var(--border2)" }}/>
                        <span style={{ fontSize:13, color:isActive?"var(--accent)":"var(--text2)", fontWeight:isActive?700:400, flex:1, textAlign:"left" }}>{t.label}</span>
                        {isActive && <span style={{ fontSize:11, color:"var(--accent)" }}>✓</span>}
                      </button>
                    );
                  })}
                  <div style={{ marginTop:8, padding:"8px 10px", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, color:"var(--text3)" }}>Mode:</span>
                    <button onClick={() => { toggleMode(); setThemeOpen(false); }}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:6, border:"1px solid var(--border2)", background:"var(--surface2)", cursor:"pointer", fontSize:12, color:"var(--text2)", fontFamily:"var(--ff-sans)" }}>
                      {isDark ? <><Sun size={11} color="#fbbf24"/> Light</> : <><Moon size={11}/> Dark</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User / Login */}
            {user ? (
              <>
                <Link href="/profile" className="hide-mobile" title="Profile"
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8, border:"1px solid var(--border2)", background:"var(--surface2)", color:"var(--text2)", fontSize:13, textDecoration:"none" }}>
                  {user.image ? <img src={user.image} style={{ width:22, height:22, borderRadius:"50%" }} alt=""/> : <UserCircle size={15}/>}
                  <span style={{ maxWidth:72, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name?.split(" ")[0]}</span>
                </Link>
                <button onClick={logout} className="hide-mobile" title="Log out"
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", width:34, height:34, borderRadius:8, border:"1px solid var(--border2)", background:"var(--surface2)", cursor:"pointer", color:"var(--text2)" }}>
                  <LogOut size={14}/>
                </button>
              </>
            ) : (
              <Link href="/login" className="hide-mobile"
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:8, background:"var(--accent)", color:"#fff", textDecoration:"none", fontSize:13, fontWeight:600 }}>
                <LogIn size={14}/> Login
              </Link>
            )}

            {/* Admin — only visible to allow-listed admin emails */}
            {admin && (
              <Link href="/admin" className="hide-mobile" title="Admin panel"
                style={{ display:"flex", alignItems:"center", justifyContent:"center", width:34, height:34, borderRadius:8, border:"1px solid var(--border2)", background:"var(--surface2)", textDecoration:"none" }}>
                <Shield size={15} color="var(--text3)"/>
              </Link>
            )}

            {/* Cart */}
            <Link href="/cart" style={{ position:"relative", display:"flex", padding:8, borderRadius:8, textDecoration:"none" }}>
              <ShoppingBag size={18} color="var(--text2)"/>
              {cartN > 0 && (
                <span style={{ position:"absolute", top:2, right:2, width:17, height:17, borderRadius:"50%", background:"var(--accent)", color:"#fff", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {cartN > 9 ? "9+" : cartN}
                </span>
              )}
            </Link>

            {/* Mobile hamburger */}
            <button onClick={() => setOpen(!open)} className="show-mobile-flex"
              style={{ display:"none", padding:8, background:"none", border:"none", cursor:"pointer", color:"var(--text2)" }}>
              {open ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div style={{ borderTop:"1px solid var(--border)", background:"var(--bg2)", padding:"12px 16px 20px" }}>
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                style={{ display:"block", padding:"12px 8px", fontSize:15, fontWeight:active(l.href)?600:400, color:active(l.href)?"var(--accent)":"var(--text2)", textDecoration:"none", borderBottom:"1px solid var(--border)" }}>
                {l.label}
              </Link>
            ))}
            {/* Theme grid on mobile */}
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:11, color:"var(--text3)", fontWeight:600, textTransform:"uppercase", marginBottom:8 }}>Theme</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:10 }}>
                {THEMES.map(t => {
                  const isActive = theme === t.dark || theme === t.light;
                  return (
                    <button key={t.id} onClick={() => { applyTheme(isDark ? t.dark : t.light); setOpen(false); }}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 10px", borderRadius:9, border:`1.5px solid ${isActive?"var(--accent)":"var(--border)"}`, background:isActive?"var(--surface2)":"var(--surface)", cursor:"pointer" }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:t.dot, flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:isActive?"var(--accent)":"var(--text2)", fontWeight:isActive?700:400 }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { toggleMode(); setOpen(false); }}
                  style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px", borderRadius:8, border:"1px solid var(--border2)", background:"var(--surface)", cursor:"pointer", fontSize:13, color:"var(--text2)", fontFamily:"var(--ff-sans)" }}>
                  {isDark ? <><Sun size={14} color="#fbbf24"/> Light mode</> : <><Moon size={14}/> Dark mode</>}
                </button>
                {user ? (
                  <>
                    <Link href="/profile" onClick={() => setOpen(false)}
                      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px", borderRadius:8, border:"1px solid var(--border2)", background:"var(--surface)", cursor:"pointer", fontSize:13, color:"var(--text2)", fontFamily:"var(--ff-sans)", textDecoration:"none" }}>
                      <UserCircle size={14}/> Profile
                    </Link>
                    <button onClick={() => { logout(); setOpen(false); }}
                      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px", borderRadius:8, border:"1px solid var(--border2)", background:"var(--surface)", cursor:"pointer", fontSize:13, color:"var(--text2)", fontFamily:"var(--ff-sans)" }}>
                      <LogOut size={14}/> Logout
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setOpen(false)}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px", borderRadius:8, background:"var(--accent)", color:"#fff", textDecoration:"none", fontSize:13, fontWeight:600 }}>
                    <LogIn size={14}/> Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {themeOpen && <div onClick={() => setThemeOpen(false)} style={{ position:"fixed", inset:0, zIndex:99 }}/>}

      <style>{`
        @media(min-width:769px){.show-mobile-flex{display:none!important}}
        @media(max-width:768px){.show-mobile-flex{display:flex!important}}
      `}</style>
    </>
  );
}
