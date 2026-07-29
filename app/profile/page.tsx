import { Suspense } from "react";
import ProfileRouter from "./ProfileRouter";

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="container-sm" style={{ paddingTop: 60 }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      </div>
    }>
      <ProfileRouter />
    </Suspense>
  );
}
