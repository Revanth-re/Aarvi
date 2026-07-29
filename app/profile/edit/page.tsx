"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useApp, useToast } from "@/store";
import { Screen } from "@/components/kit";
import TopBar from "@/components/shell/TopBar";
import Avatar from "@/components/ui/Avatar";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, setUser } = useApp();
  const showToast = useToast(s => s.show);

  const [name, setName] = useState(user?.name ?? "");
  const [handle, setHandle] = useState(user?.handle ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (<><TopBar title="Edit profile"/><Screen><p style={{ color: "var(--text3)" }}>Log in first.</p></Screen></>);
  }

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/users/${user._id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, bio }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { showToast(d.error || "Couldn't save", "error"); return; }

      setUser({ ...user, ...d.user });
      showToast("Profile updated", "success");
      router.push("/profile");
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Edit profile"/>
      <Screen>
        <button onClick={() => router.back()} aria-label="Back"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", padding: 0 }}>
          <ArrowLeft size={20}/>
        </button>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Avatar name={name} image={user.image} size={80}/>
        </div>

        <label style={label}>Display name
          <input className="inp" value={name} onChange={e => setName(e.target.value)} maxLength={50}/>
        </label>

        <label style={label}>Handle
          <input className="inp" value={handle} maxLength={24}
            onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
            placeholder="yourname"/>
          <span style={hint}>Letters, numbers, dots and underscores. Must be unique.</span>
        </label>

        <label style={label}>Bio
          <textarea className="inp" rows={3} value={bio} maxLength={160}
            onChange={e => setBio(e.target.value)}
            placeholder="audio drama addict · 2× speed enjoyer"/>
          <span style={hint}>{bio.length}/160</span>
        </label>

        <button onClick={save} disabled={busy} className="btn btn-primary" style={{ width: "100%" }}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </Screen>
    </>
  );
}

const label: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
  fontSize: 13, fontWeight: 600, color: "var(--text2)",
};
const hint: React.CSSProperties = { fontSize: 11, color: "var(--text3)", fontWeight: 400 };
