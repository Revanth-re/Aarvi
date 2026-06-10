import { NextResponse } from "next/server";

export async function GET() {
  const clientId   = process.env.GOOGLE_CLIENT_ID;
  const baseUrl    = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL;

  if (!clientId || !baseUrl) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID or BASE_URL not set in environment variables" },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
