import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  phone:     { type: String, required: true, unique: true },
  name:      { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});
const UserModel = mongoose.models.User ?? mongoose.model("User", UserSchema);

export async function POST(request: NextRequest) {
  try {
    const { phone, name } = await request.json();
    await connectDB();
    const user = await UserModel.findOneAndUpdate(
      { phone },
      { name },
      { new: true }
    );
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      user: { _id: user._id.toString(), phone: user.phone, name: user.name, createdAt: user.createdAt }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
