import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientRoot from "@/components/shell/ClientRoot";

export const metadata: Metadata = {
  title: "SWARA FM — Audio stories, in your language",
  description: "Audio drama, shorts and thoughts. Listen, react, collect.",
  // Makes the app installable ("Download app") straight from the
  // browser — Chrome/Android shows its native install prompt, and
  // iOS/Safari picks these up for "Add to Home Screen" even without
  // one. See components/shell/InstallPrompt.tsx for the in-app nudge.
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SWARA FM",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The app is a full-screen phone UI; letting it zoom breaks the
  // fixed tab bar and the full-bleed Shorts feed.
  maximumScale: 1,
  themeColor: "#8B5CF6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="lavender-light" data-font="sora" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        {/* One request for every selectable font style (Settings →
            Appearance → Font Style) so switching is instant with no
            extra network round-trip. */}
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Roboto+Slab:wght@400;500;600;700&family=Baloo+2:wght@400;500;600;700;800&family=Lora:wght@400;500;600;700&family=Fredoka:wght@400;500;600;700&family=Caveat:wght@400;500;600;700&family=Righteous&display=swap" rel="stylesheet"/>
        {/* Applies the saved theme + font before first paint. Without this
            the app flashes the default lavender-light/Sora for one frame
            on every load for anyone using a different palette, mode or
            font. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var s = JSON.parse(localStorage.getItem('swara-app') || '{}').state || {};
            var set = s.settings || {};
            var color = set.themeColor || 'lavender';
            var mode = set.themeMode || 'light';
            var font = set.fontStyle || 'sora';
            if (mode === 'system') {
              mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            var colors = ['lavender','rosegold','mint','cyberblue','peach','midnight'];
            if (colors.indexOf(color) < 0) color = 'lavender';
            if (mode !== 'dark' && mode !== 'light') mode = 'light';
            var fonts = ['sora','neo','slab','rounded','serif','playful','handwritten','retro'];
            if (fonts.indexOf(font) < 0) font = 'sora';
            document.documentElement.setAttribute('data-theme', color + '-' + mode);
            document.documentElement.setAttribute('data-font', font);
          } catch (e) {
            document.documentElement.setAttribute('data-theme', 'lavender-light');
            document.documentElement.setAttribute('data-font', 'sora');
          }
        `}}/>
      </head>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
