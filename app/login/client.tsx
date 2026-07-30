"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp, useToast } from "@/store";
import { Radio, Loader2 } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  server_error: "Something went wrong on our end signing you in. Please try again.",
  cancelled: "Sign-in was cancelled.",
  token_failed: "Google sign-in failed. Please try again.",
  parse_failed: "Something went wrong signing you in. Please try again.",
  admin_only: "That page is restricted to admins.",
};

type Mode = "login" | "signup";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useApp();
  const showToast = useToast(s => s.show);
  const [redirecting, setRedirecting] = useState(false);

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (user) router.push("/"); }, [user]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      showToast(ERROR_MESSAGES[error] || "Something went wrong. Please try again.", "error");
    }
  }, [searchParams]);

  const loginWithGoogle = () => {
    setRedirecting(true);
    window.location.href = "/api/auth/google";
  };

  const submit = async () => {
    setErr("");
    if (mode === "login" && (!username.trim() || !password)) {
      setErr("Enter your username/mobile and password.");
      return;
    }
    if (mode === "signup" && (!name.trim() || !username.trim() || !mobile.trim() || !password)) {
      setErr("Fill in every field.");
      return;
    }

    setBusy(true);
    try {
      const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body = mode === "signup"
        ? { name, username, mobile, password }
        : { identifier: username, password };

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok || d.error) { setErr(d.error || "Something went wrong."); return; }

      setUser(d.user);
      router.push("/");
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px" }}>

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Radio size={20} color="#fff" strokeWidth={2.5}/>
        </div>
        <span style={{ fontSize:22, fontWeight:700, color:"var(--text)", letterSpacing:"-.02em" }}>SWARA FM</span>
      </div>

      <div style={{ maxWidth:380, width:"100%", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20, padding:"32px 28px", boxShadow:"var(--shadow-lg)" }}>

        <div style={{ textAlign:"center", marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:"var(--text)", marginBottom:6 }}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p style={{ fontSize:13, color:"var(--text3)", lineHeight:1.6 }}>
            Sign in to save your progress, thoughts and followers
          </p>
        </div>

        {/* Google Sign In */}
        <button onClick={loginWithGoogle} disabled={redirecting}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:"13px 20px", borderRadius:12, border:"1.5px solid var(--border2)", background:"var(--surface2)", cursor: redirecting ? "default" : "pointer", fontSize:14.5, fontWeight:600, color:"var(--text)", marginBottom:18, opacity: redirecting ? .7 : 1 }}
        >
          {redirecting ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {redirecting ? "Redirecting to Google…" : "Continue with Google"}
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0 18px" }}>
          <span style={{ flex:1, height:1, background:"var(--border)" }}/>
          <span style={{ fontSize:11.5, color:"var(--text3)" }}>or</span>
          <span style={{ flex:1, height:1, background:"var(--border)" }}/>
        </div>

        {/* Mode toggle */}
        <div style={{ display:"flex", gap:6, marginBottom:16, background:"var(--surface2)", borderRadius:12, padding:4 }}>
          {(["login", "signup"] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }}
              style={{
                flex:1, padding:"8px 0", borderRadius:9, border:"none", cursor:"pointer",
                fontSize:13, fontWeight:700, fontFamily:"inherit",
                background: mode === m ? "var(--grad)" : "transparent",
                color: mode === m ? "#fff" : "var(--text2)",
              }}>
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        {err && (
          <div style={{
            padding:"10px 12px", borderRadius:10, fontSize:12.5, marginBottom:14,
            background:"color-mix(in srgb, var(--danger) 12%, transparent)",
            border:"1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
            color:"var(--danger)",
          }}>
            {err}
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
          {mode === "signup" && (
            <input className="inp" placeholder="Your name" value={name}
              onChange={e => setName(e.target.value)} maxLength={50}/>
          )}
          <input className="inp" placeholder={mode === "signup" ? "Choose a username" : "Username or mobile number"}
            value={username} onChange={e => setUsername(e.target.value)}/>
          {mode === "signup" && (
            <input className="inp" placeholder="Mobile number" value={mobile}
              onChange={e => setMobile(e.target.value)} type="tel"/>
          )}
          <input className="inp" placeholder="Password" value={password} type="password"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}/>
        </div>

        <button onClick={submit} disabled={busy} className="btn btn-primary"
          style={{ width:"100%", justifyContent:"center", marginBottom:18 }}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </button>

        {/* Guest option */}
        <div style={{ textAlign:"center", paddingTop:16, borderTop:"1px solid var(--border)" }}>
          <button onClick={() => router.push("/")}
            style={{ background:"none", border:"none", color:"var(--accent)", fontSize:13.5, fontWeight:600, cursor:"pointer" }}>
            Browse as Guest →
          </button>
        </div>
      </div>

      <p style={{ marginTop:24, fontSize:12, color:"var(--text3)", textAlign:"center", maxWidth:300, lineHeight:1.6 }}>
        You can browse and listen to every series without logging in. Login is only needed to save favourites, follow people and message them.
      </p>
    </div>
  );
}
