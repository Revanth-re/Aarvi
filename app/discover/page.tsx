import MobileDiscover from "@/components/mobile/MobileDiscover";

export const metadata = {
  title: "Discover — Aarvi",
  description: "Search shows, browse genres and find rising creators.",
};

export default function DiscoverPage() {
  // Deliberately not gated behind a mobile check: this is a genuinely
  // useful browse/search screen at any width, and the bottom tab bar
  // that links to it is the mobile-only part.
  return <MobileDiscover/>;
}
