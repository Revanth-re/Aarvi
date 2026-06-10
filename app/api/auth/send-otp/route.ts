import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expires: number }>();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSms(phone: string, otp: string) {
  const apiKey = process.env.FAST2SMS_API_KEY;

  // If no SMS key, use mock mode (OTP logged to console)
  if (!apiKey) {
    console.log(`[MOCK OTP] Phone: ${phone}  OTP: ${otp}`);
    return true;
  }

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: { authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      route: "otp",
      variables_values: otp,
      numbers: phone.replace("+91", ""),
    }),
  });
  const data = await res.json();
  return data.return === true;
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || !/^\+91\d{10}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const otp     = generateOtp();
    const expires = Date.now() + 10 * 60 * 1000; // 10 mins

    otpStore.set(phone, { otp, expires });

    await sendSms(phone, otp);

    return NextResponse.json({ ok: true, message: "OTP sent" });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

// Export store for verify route (same module)
export { otpStore };
