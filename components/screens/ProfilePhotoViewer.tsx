"use client";
import { X } from "lucide-react";

/* eslint-disable @next/next/no-img-element */

interface Props {
  open: boolean;
  onClose: () => void;
  image?: string | null;
  name?: string;
}

/**
 * Tapping a profile photo opens it full-screen, circular, on a dark
 * backdrop — the same pattern Instagram uses on a profile page itself
 * (as opposed to the small avatars in a list, which stay pure
 * navigation and aren't wired to this).
 */
export default function ProfilePhotoViewer({ open, onClose, image, name }: Props) {
  if (!open) return null;
  return (
    <div onClick={onClose} className="anim-in" style={{
      position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <button onClick={onClose} aria-label="Close" style={{
        position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.14)",
        border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex",
        alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff",
      }}>
        <X size={18}/>
      </button>

      {image ? (
        <img src={image} alt={name || ""} onClick={e => e.stopPropagation()} style={{
          width: "82vw", maxWidth: 380, height: "82vw", maxHeight: 380,
          borderRadius: "50%", objectFit: "cover",
        }}/>
      ) : (
        <div onClick={e => e.stopPropagation()} style={{
          width: "82vw", maxWidth: 380, height: "82vw", maxHeight: 380, borderRadius: "50%",
          background: "var(--grad)", display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 88, fontWeight: 700, fontFamily: "var(--ff-sans)",
        }}>
          {(name || "?").trim()[0]?.toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
}
