"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/store";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { setUser }  = useApp();

  useEffect(() => {
    const userParam = searchParams.get("user");
    const error     = searchParams.get("error");

    if (error) { router.push("/login?error=" + error); return; }

    if (userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        setUser(user);
        router.push("/");
      } catch { router.push("/login?error=parse_failed"); }
    } else {
      router.push("/login");
    }
  }, []);

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", flexDirection:"column", gap:16 }}>
      <Loader2 size={32} color="var(--accent)" className="spin"/>
      <p style={{ color:"var(--text3)", fontSize:14 }}>Signing you in…</p>
    </div>
  );
}
