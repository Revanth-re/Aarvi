"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useApp, useToast } from "@/store";
import { creatorFetch } from "@/lib/creatorFetch";
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
  const [image, setImage] = useState(user?.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const pickPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) { showToast("Choose an image file", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await creatorFetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "Upload failed");
      setImage(d.url);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (<><TopBar title="Edit profile"/><Screen><p style={{ color: "var(--text3)" }}>Log in first.</p></Screen></>);
  }

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/users/${user._id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, bio, image }),
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
          <label style={{ position: "relative", cursor: "pointer", display: "inline-block" }}>
            <input type="file" accept="image/*" hidden disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) pickPhoto(f); }}/>
            <Avatar name={name} image={image} size={80}/>
            <span style={{
              position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%",
              background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center",
              justifyContent: "center", border: "2px solid var(--surface)",
            }}>
              {uploading ? <Loader2 size={13} className="spin"/> : <Camera size={13}/>}
            </span>
          </label>
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
