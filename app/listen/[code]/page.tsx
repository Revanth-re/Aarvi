import { Suspense } from "react";
import ListenRoomClient from "./client";

export default function ListenRoomPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)" }} />}>
      <ListenRoomClient />
    </Suspense>
  );
}
