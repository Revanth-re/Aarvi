import type { Metadata } from "next";
import "./globals.css";
import ClientRoot from "@/components/ui/ClientRoot";

export const metadata: Metadata = {
  title: "Aarvi — Audio Stories & Series",
  description: "Immersive audio stories, FM series, and exclusive merchandise.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="midnight-dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <script dangerouslySetInnerHTML={{__html:`
          try {
            var s = localStorage.getItem('naad-app');
            var t = s ? JSON.parse(s).state?.theme : null;
            var valid = ['midnight-dark','midnight-light','forest-dark','forest-light','desert-dark','desert-light','ocean-dark','ocean-light','rose-dark','rose-light','mono-dark','mono-light'];
            document.documentElement.setAttribute('data-theme', (t && valid.includes(t)) ? t : 'midnight-dark');
          } catch(e) {
            document.documentElement.setAttribute('data-theme', 'midnight-dark');
          }
        `}}/>
      </head>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
