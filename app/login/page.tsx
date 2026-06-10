"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/store";
import { Radio } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useApp();

  useEffect(() => { if (user) router.push("/"); }, [user]);

  const loginWithGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px" }}>

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:36 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Radio size={20} color="#fff" strokeWidth={2.5}/>
        </div>
        <span style={{ fontSize:24, fontWeight:700, color:"var(--text)", letterSpacing:"-.3px" }}>Aarvi</span>
      </div>

      <div style={{ maxWidth:380, width:"100%", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20, padding:"36px 28px", boxShadow:"var(--shadow-lg)" }}>

        <div style={{ textAlign:"center", marginBottom:28 }}>
          <h1 style={{ fontSize:24, fontWeight:700, color:"var(--text)", marginBottom:8 }}>Welcome to Aarvi</h1>
          <p style={{ fontSize:14, color:"var(--text3)", lineHeight:1.6 }}>Sign in to save your progress, liked series, and cart items</p>
        </div>

        {/* Google Sign In */}
        <button onClick={loginWithGoogle}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:"14px 20px", borderRadius:12, border:"1.5px solid var(--border2)", background:"var(--surface2)", cursor:"pointer", fontSize:15, fontWeight:600, color:"var(--text)", transition:"all .15s", marginBottom:16 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--bg2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface2)"; }}
        >
          {/* Google SVG icon */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Guest option */}
        <div style={{ textAlign:"center", paddingTop:16, borderTop:"1px solid var(--border)" }}>
          <p style={{ fontSize:13, color:"var(--text3)", marginBottom:10 }}>Don't want to sign in?</p>
          <button onClick={() => router.push("/")}
            style={{ background:"none", border:"none", color:"var(--accent)", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Browse as Guest →
          </button>
        </div>
      </div>

      <p style={{ marginTop:24, fontSize:12, color:"var(--text3)", textAlign:"center", maxWidth:300, lineHeight:1.6 }}>
        You can browse and listen to all series without logging in. Login is only needed to save your favourites.
      </p>
    </div>
  );
}
