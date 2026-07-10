"use client";
import { useState, useRef } from "react";
import { Upload, X, Loader2, FileAudio, ImageIcon, Plus } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

interface Props {
  onUpload: (url: string) => void;
  type: "image" | "audio";
  currentUrl?: string;
  label?: string;
  compact?: boolean;
}

export default function FileUpload({ onUpload, type, currentUrl, label, compact = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (type === "image" && !file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (type === "audio" && !file.type.startsWith("audio/")) {
      setError("Please select an audio file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await adminFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.url) {
        onUpload(data.url);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>{label}</label>}

      <div style={{
        position: "relative",
        border: "2px dashed var(--border)",
        borderRadius: 12,
        padding: "16px",
        textAlign: "center",
        background: "var(--surface2)",
        transition: "all 0.2s",
        borderColor: error ? "var(--danger)" : "var(--border)"
      }}>
        {loading ? (
          <div style={{ padding: compact ? "10px 0" : "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: compact ? 4 : 10 }}>
            <Loader2 className="animate-spin" size={compact ? 16 : 24} color="var(--accent)" />
            {!compact && <span style={{ fontSize: 13, color: "var(--muted)" }}>Uploading...</span>}
          </div>
        ) : currentUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", height: compact ? "100%" : "auto" }}>
            <div style={{
              width: compact ? "100%" : 48, height: compact ? "100%" : 48,
              borderRadius: 8, background: "var(--bg)",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
            }}>
              {type === "image" ? (
                <img src={currentUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <FileAudio size={20} color="var(--accent)" />
              )}
            </div>
            {!compact && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUrl.split("/").pop()}
                </p>
                <button
                  onClick={(e) => { e.preventDefault(); onUpload(""); }}
                  style={{ fontSize: 11, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            style={{ cursor: "pointer", padding: compact ? "4px 0" : "12px 0", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}
          >
            {compact ? (
              <Plus size={20} color="var(--text3)" style={{ margin: "0 auto" }} />
            ) : (
              <>
                {type === "image" ? <ImageIcon size={24} color="var(--muted)" style={{ margin: "0 auto 8px" }} /> : <FileAudio size={24} color="var(--muted)" style={{ margin: "0 auto 8px" }} />}
                <p style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>
                  Click to upload {type}
                </p>
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  Drag and drop or browse files
                </p>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={type === "image" ? "image/*" : "audio/*"}
          onChange={handleFile}
          hidden
        />
      </div>
      {error && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
