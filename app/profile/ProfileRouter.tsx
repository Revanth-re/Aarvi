"use client";
import { useIsMobile } from "@/lib/useResponsive";
import MobileProfile from "@/components/mobile/MobileProfile";
import ProfilePageClient from "./client";

// Picks the profile experience by viewport.
//
// Mobile gets the app-style screen (streak, squad, badges, wallet).
// Desktop keeps the existing profile page — favorites, playlists,
// followers/following and follow requests — completely unchanged.
//
// Both link to each other's features rather than duplicating them:
// the mobile screen's "Edit profile & followers" row deep-links here.
export default function ProfileRouter() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileProfile/> : <ProfilePageClient/>;
}
