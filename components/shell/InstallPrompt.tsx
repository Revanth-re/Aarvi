"use client";
import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { useApp, useInstallPrompt, BeforeInstallPromptEvent } from "@/store";
import { registerServiceWorker } from "@/lib/push-client";

const SEEN_KEY = "swara-install-seen";

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Loopz-style "download our app" nudge, but for the web — there's no
// native app to download here, so "installing" means adding this PWA
// to the home screen. Chrome/Android gets a real one-tap install via
// `beforeinstallprompt`; iOS Safari has no such API, so it gets
// share-sheet instructions instead. Headless except for the modal
// itself, mounted once in ClientRoot; components/screens/ProfileScreen
// can reopen it any time via useInstallPrompt.getState().show().
export default function InstallPrompt() {
  const user = useApp(s => s.user);
  const visible = useInstallPrompt(s => s.visible);
  const deferredEvent = useInstallPrompt(s => s.deferredEvent);
  const setDeferredEvent = useInstallPrompt(s => s.setDeferredEvent);
  const show = useInstallPrompt(s => s.show);
  const hide = useInstallPrompt(s => s.hide);
  const [installing, setInstalling] = useState(false);

  // Registered unconditionally (not just when someone opts into push)
  // — some browsers only count the app as installable once an active
  // service worker is controlling the page, and this is also what
  // lib/push-client.ts's enablePush() reuses when notifications are
  // turned on later.
  useEffect(() => { registerServiceWorker(); }, []);

  // Chrome/Android/desktop Chrome fire this once, early — capture it
  // and suppress the browser's own mini-infobar so our modal is the
  // single, consistent entry point instead of two competing prompts.
  useEffect(() => {
    if (isStandalone()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [setDeferredEvent]);

  // Auto-nudge once, a couple seconds after someone's logged in — not
  // on first paint, so it never interrupts signup/login itself.
  useEffect(() => {
    if (!user || isStandalone()) return;
    if (typeof window === "undefined" || localStorage.getItem(SEEN_KEY)) return;
    const canOfferIOS = isIOS();
    const t = setTimeout(() => {
      if (deferredEvent || canOfferIOS) show();
    }, 2200);
    return () => clearTimeout(t);
    // Only the initial mount after login matters here — deliberately
    // not re-running this just because deferredEvent arrives later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, "1");
    hide();
  };

  const install = async () => {
    if (!deferredEvent) return;
    setInstalling(true);
    try {
      await deferredEvent.prompt();
      await deferredEvent.userChoice;
      setDeferredEvent(null);
    } finally {
      setInstalling(false);
      localStorage.setItem(SEEN_KEY, "1");
      hide();
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, display: "flex",
      alignItems: "flex-end", justifyContent: "center",
      background: "rgba(0,0,0,.45)",
    }} onClick={dismiss}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, background: "var(--bg2)",
          borderRadius: "20px 20px 0 0", padding: "22px 20px calc(22px + env(safe-area-inset-bottom,0px))",
          boxShadow: "var(--shadow-lg)",
        }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={dismiss} aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", display: "flex" }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <span style={{
            width: 52, height: 52, borderRadius: 14, background: "var(--grad)", flex: "none",
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)",
          }}>
            <Download size={22} color="#fff"/>
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>Get the SWARA FM app</div>
            <div style={{ fontSize: 12.5, color: "var(--text3)" }}>Full screen, faster, no browser bar</div>
          </div>
        </div>

        {deferredEvent ? (
          <button onClick={install} disabled={installing} className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 14 }}>
            {installing ? "Installing…" : <><Download size={16}/>Install app</>}
          </button>
        ) : (
          <div style={{ background: "var(--surface2)", borderRadius: 14, padding: 14, display: "flex", gap: 10 }}>
            <Share size={18} color="var(--accent)" style={{ flex: "none", marginTop: 1 }}/>
            <p style={{ fontSize: 12.5, color: "var(--text2)", margin: 0, lineHeight: 1.6 }}>
              Tap the <strong>Share</strong> icon in your browser&rsquo;s toolbar, then
              choose <strong>&ldquo;Add to Home Screen.&rdquo;</strong>
            </p>
          </div>
        )}

        <button onClick={dismiss} className="btn btn-ghost btn-sm"
          style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
