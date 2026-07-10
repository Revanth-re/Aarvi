import { Suspense } from "react";
import ProfilePageClient from "./client";

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="container-sm" style={{ paddingTop: 60 }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      </div>
    }>
      <ProfilePageClient />
    </Suspense>
  );
}
