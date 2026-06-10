import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  googleId:  { type: String, unique: true },
  email:     { type: String },
  name:      { type: String },
  image:     { type: String },
  createdAt: { type: Date, default: Date.now },
});
const UserModel = mongoose.models.User ?? mongoose.model("User", UserSchema);

export async function GET(request: NextRequest) {
  const baseUrl      = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri  = `${baseUrl}/api/auth/google/callback`;

  const code  = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/login?error=cancelled`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }).toString(),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      return NextResponse.redirect(`${baseUrl}/login?error=token_failed`);
    }

    // Get Google user info
    const userRes    = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json();

    await connectDB();

    const user = await UserModel.findOneAndUpdate(
      { googleId: googleUser.id },
      { googleId: googleUser.id, email: googleUser.email, name: googleUser.name, image: googleUser.picture },
      { upsert: true, new: true }
    );

    const userData = encodeURIComponent(JSON.stringify({
      _id:      user._id.toString(),
      name:     user.name,
      email:    user.email,
      image:    user.image,
      createdAt: user.createdAt,
    }));

    return NextResponse.redirect(`${baseUrl}/auth/callback?user=${userData}`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=server_error`);
  }
}
