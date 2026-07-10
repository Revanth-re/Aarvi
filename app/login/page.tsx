import { Suspense } from "react";
import LoginClient from "./client";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"var(--bg)" }} />
    }>
      <LoginClient />
    </Suspense>
  );
}
