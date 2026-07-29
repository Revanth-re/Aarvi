import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientRoot from "@/components/shell/ClientRoot";
import { fontDisplay } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "SWARA FM — Audio stories, in your language",
  description: "Audio drama, shorts and thoughts. Listen, react, collect.",
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
    <html lang="en" data-theme="lavender-light" suppressHydrationWarning className={fontDisplay.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
        {/* Applies the saved theme before first paint. Without this the
            app flashes the default lavender-light for one frame on
            every load for anyone using a different palette or dark mode. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var s = JSON.parse(localStorage.getItem('swara-app') || '{}').state || {};
            var set = s.settings || {};
            var color = set.themeColor || 'lavender';
            var mode = set.themeMode || 'light';
            if (mode === 'system') {
              mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            var colors = ['lavender','rosegold','mint','cyberblue','peach','midnight'];
            if (colors.indexOf(color) < 0) color = 'lavender';
            if (mode !== 'dark' && mode !== 'light') mode = 'light';
            document.documentElement.setAttribute('data-theme', color + '-' + mode);
          } catch (e) {
            document.documentElement.setAttribute('data-theme', 'lavender-light');
          }
        `}}/>
      </head>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
