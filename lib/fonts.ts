// Centralized typography system.
//
// Two font families are exposed as CSS variables so every part of the
// app pulls from one source of truth instead of hardcoding font names:
//
//   --font-display  -> QuickBaby (brand font)  -> Tailwind `font-display`
//   --font-body     -> Sora (already loaded via <link> in app/layout.tsx,
//                      see --ff-sans in app/globals.css)              -> Tailwind `font-sans`
//
// Brand font usage (per brand guidelines): logo, brand name, splash
// screen, hero headings, auth screen headings, marketing sections,
// section titles, featured/promo banners, empty-state titles.
//
// Never use the brand font for paragraphs, forms, tables, dashboards,
// settings/admin panels, descriptions, buttons, or inputs — those stay
// on the body sans font (Sora / --ff-sans) for readability.
import localFont from "next/font/local";

export const fontDisplay = localFont({
  src: "../app/fonts/QuickBaby-G3Evm.otf",
  variable: "--font-display",
  display: "swap",
  preload: true,
});
