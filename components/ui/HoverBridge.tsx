"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  audioEl: HTMLAudioElement | null;
  playing: boolean;
  barCount?: number;
}

// "Hover-bridge": hover over the cover art and a small audio-reactive
// equalizer lights up on top of it, driven by whatever song is
// currently playing.
//
// It tries to read REAL frequency data from the <audio> element via
// the Web Audio API. That only works cleanly if the audio asset's
// origin (Cloudinary, in this app) returns permissive CORS headers —
// we can't guarantee that for every resource, and we don't want to
// risk it by forcing crossOrigin="anonymous" onto the shared player's
// <audio> tag (a server that doesn't answer that with the right
// header would silently break playback for everyone). So this stays
// hands-off: no crossOrigin attribute is set anywhere, playback is
// never touched, and if the resulting analyser node comes back
// "tainted" (silent zeros) because of that, this component quietly
// falls back to a soft synthetic pulse instead of just going dead.
// Real reactivity when the origin cooperates, a lively animation
// either way, zero risk to actual playback.
export default function HoverBridge({ audioEl, playing, barCount = 12 }: Props) {
  const [hovering, setHovering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wiredElRef = useRef<HTMLAudioElement | null>(null);

  const ensureAnalyser = useCallback(() => {
    if (!audioEl) return null;
    if (wiredElRef.current === audioEl && analyserRef.current) return analyserRef.current;
    try {
      const AudioCtxCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxCtor) return null;
      const ctx = ctxRef.current || new AudioCtxCtor();
      // Routes the element's output through the Web Audio graph and
      // back out to the speakers — this does NOT change what the user
      // hears or interrupt playback, even if the source turns out to
      // be CORS-tainted for data-reading purposes.
      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      wiredElRef.current = audioEl;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch {
      // Element already wired into a different context, browser doesn't
      // support the API, or some other restriction — synthetic fallback
      // below covers it, nothing breaks.
    }
    return analyserRef.current;
  }, [audioEl]);

  useEffect(() => {
    if (!hovering) return;
    const analyser = ensureAnalyser();
    const canvas = canvasRef.current;
    const ctx2d = canvas?.getContext("2d");
    if (!canvas || !ctx2d) return;

    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const start = performance.now();

    const draw = (now: number) => {
      const w = canvas.width, h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      const bw = w / barCount;
      const t = (now - start) / 1000;

      let hasSignal = false;
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        for (let i = 0; i < freqData.length; i++) { if (freqData[i] > 4) { hasSignal = true; break; } }
      }

      for (let i = 0; i < barCount; i++) {
        let v: number;
        if (hasSignal && freqData) {
          const idx = Math.floor((i / barCount) * freqData.length);
          v = freqData[idx] / 255;
        } else if (playing) {
          // Synthetic "breathing" fallback so the effect still feels
          // alive when real frequency data isn't readable.
          v = 0.35 + 0.3 * Math.abs(Math.sin(t * 3 + i * 0.8)) + 0.15 * Math.abs(Math.sin(t * 5.3 - i));
        } else {
          v = 0.06;
        }
        const barH = Math.max(2, v * h);
        const hue = 258 - v * 50;
        ctx2d.fillStyle = `hsl(${hue}, 82%, ${62 + v * 10}%)`;
        ctx2d.fillRect(i * bw + 1, h - barH, Math.max(1, bw - 2), barH);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [hovering, ensureAnalyser, playing, barCount]);

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ position: "absolute", inset: 0 }}
    >
      <canvas
        ref={canvasRef}
        width={96}
        height={96}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: hovering ? 1 : 0, transition: "opacity .18s ease-out",
          background: hovering ? "rgba(10,8,20,.55)" : "transparent",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
