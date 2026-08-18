"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, ZoomIn } from "lucide-react";

const FILTERS: { key: string; label: string; css: string }[] = [
  { key: "none",    label: "Normal",  css: "" },
  { key: "bw",      label: "B&W",     css: "grayscale(100%)" },
  { key: "sepia",   label: "Sepia",   css: "sepia(70%)" },
  { key: "vintage", label: "Vintage", css: "sepia(35%) contrast(105%) brightness(95%) saturate(120%)" },
  { key: "bright",  label: "Bright",  css: "brightness(115%) saturate(110%)" },
  { key: "cool",    label: "Cool",    css: "hue-rotate(-8deg) saturate(105%) brightness(103%)" },
];

const DISPLAY_SIZE = 300;
const EXPORT_SIZE = 640;

interface Props {
  /** A data URL or object URL for the picked file. */
  src: string;
  onCancel: () => void;
  /** Receives the final cropped+filtered image as a data URL. */
  onConfirm: (dataUrl: string) => void;
}

/**
 * Crop + adjust + confirm before a new profile photo actually applies
 * — per the requirements, tapping a new photo must never apply it
 * immediately. Drag to reposition, slider to zoom, tap a filter to
 * preview it live, then Apply renders the final square image.
 */
export default function PhotoEditorModal({ src, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // fractions of frame size
  const [filter, setFilter] = useState(FILTERS[0]);
  const [applying, setApplying] = useState(false);

  const dragState = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    img.src = src;
  }, [src]);

  const bounds = useCallback(() => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const wRatio = (img.naturalWidth / minDim) * scale;
    const hRatio = (img.naturalHeight / minDim) * scale;
    return { x: Math.max(0, (wRatio - 1) / 2), y: Math.max(0, (hRatio - 1) / 2) };
  }, [scale]);

  const clamp = useCallback((o: { x: number; y: number }) => {
    const b = bounds();
    return {
      x: Math.max(-b.x, Math.min(b.x, o.x)),
      y: Math.max(-b.y, Math.min(b.y, o.y)),
    };
  }, [bounds]);

  const draw = useCallback((canvas: HTMLCanvasElement | null, size: number) => {
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = size; canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.filter = filter.css || "none";
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const baseScale = size / minDim;
    const s = baseScale * scale;
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    const cx = size / 2 + offset.x * size;
    const cy = size / 2 + offset.y * size;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  }, [scale, offset, filter]);

  useEffect(() => { draw(canvasRef.current, DISPLAY_SIZE); }, [draw, imgLoaded]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = (e.clientX - dragState.current.startX) / DISPLAY_SIZE;
    const dy = (e.clientY - dragState.current.startY) / DISPLAY_SIZE;
    setOffset(clamp({ x: dragState.current.startOffset.x + dx, y: dragState.current.startOffset.y + dy }));
  };
  const onPointerUp = () => { dragState.current = null; };

  const changeScale = (next: number) => {
    setScale(next);
    setOffset(o => clamp(o));
  };

  const apply = () => {
    setApplying(true);
    // Redraw at export resolution with the same relative crop/filter,
    // then hand back a data URL for the caller to upload.
    const exportCanvas = document.createElement("canvas");
    draw(exportCanvas, EXPORT_SIZE);
    const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.92);
    onConfirm(dataUrl);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 600, background: "#0B0910",
      maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column",
    }} className="anim-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
        <button onClick={onCancel} aria-label="Cancel" style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}>
          <X size={22}/>
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Edit photo</span>
        <button onClick={apply} disabled={!imgLoaded || applying} aria-label="Apply"
          style={{
            background: "var(--grad)", border: "none", borderRadius: "var(--r-pill)", cursor: "pointer",
            color: "#fff", display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, fontWeight: 700,
          }}>
          <Check size={15}/>{applying ? "…" : "Apply"}
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: "0 20px" }}>
        <div style={{ position: "relative", width: DISPLAY_SIZE, height: DISPLAY_SIZE, flex: "none" }}>
          <canvas
            ref={canvasRef}
            width={DISPLAY_SIZE} height={DISPLAY_SIZE}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
            style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, borderRadius: "50%", touchAction: "none", cursor: "grab", display: "block", background: "#1a1520" }}
          />
          {/* Guide ring only — the exported image stays a normal square
              JPEG; avatars render it circular at display time (see
              components/ui/Avatar.tsx), same as everywhere else in the app. */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,.85)", pointerEvents: "none",
          }}/>
        </div>

        <div style={{ width: "100%", maxWidth: 260, display: "flex", alignItems: "center", gap: 10 }}>
          <ZoomIn size={15} color="rgba(255,255,255,.7)"/>
          <input type="range" min={1} max={3} step={0.01} value={scale}
            onChange={e => changeScale(Number(e.target.value))}
            aria-label="Zoom" style={{ flex: 1, accentColor: "var(--accent)" }}/>
        </div>

        <div style={{ display: "flex", gap: 10, overflowX: "auto", width: "100%", paddingBottom: 4 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f)} style={{
              flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>
              <span style={{
                width: 46, height: 46, borderRadius: "50%", overflow: "hidden",
                border: `2px solid ${filter.key === f.key ? "var(--accent)" : "transparent"}`,
                backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center",
                filter: f.css || "none",
              }}/>
              <span style={{ fontSize: 10.5, color: filter.key === f.key ? "#fff" : "rgba(255,255,255,.6)", fontWeight: filter.key === f.key ? 700 : 500 }}>
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
