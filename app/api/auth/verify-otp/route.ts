import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

// Shared OTP store (in-memory — use Redis for production)
const otpStore = new Map<string, { otp: string; expires: number }>();

// User model inline
const UserSchema = new mongoose.Schema({
  phone:     { type: String, required: true, unique: true },
  name:      { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});
const UserModel = mongoose.models.User ?? mongoose.model("User", UserSchema);

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP required" }, { status: 400 });
    }

    // ── DEV MODE: accept "123456" as test OTP ──
    const isDev = process.env.NODE_ENV === "development" || !process.env.FAST2SMS_API_KEY;
    if (isDev && otp === "123456") {
      // bypass OTP check in dev
    } else {
      const stored = otpStore.get(phone);
      if (!stored) {
        return NextResponse.json({ error: "OTP expired or not sent" }, { status: 400 });
      }
      if (Date.now() > stored.expires) {
        otpStore.delete(phone);
        return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
      }
      if (stored.otp !== otp) {
        return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
      }
      otpStore.delete(phone);
    }

    await connectDB();

    let user = await UserModel.findOne({ phone });
    const isNew = !user;

    if (!user) {
      user = await UserModel.create({ phone });
    }

    return NextResponse.json({
      ok: true,
      isNew,
      user: {
        _id:       user._id.toString(),
        phone:     user.phone,
        name:      user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
