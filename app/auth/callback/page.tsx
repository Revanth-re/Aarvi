import { Suspense } from "react";
import AuthCallbackClient from "./client";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", flexDirection:"column", gap:16 }}>
        <div className="spin" style={{ width:32, height:32, border:"3px solid var(--border2)", borderTopColor:"var(--accent)", borderRadius:"50%" }}/>
        <p style={{ color:"var(--text3)", fontSize:14 }}>Signing you in…</p>
      </div>
    }>
      <AuthCallbackClient />
    </Suspense>
  );
}
