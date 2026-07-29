import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { handleFrom } from "@/lib/gamification";
import { idOf } from "@/lib/serialize";

/* eslint-disable @typescript-eslint/no-explicit-any */

type P = { params: Promise<{ id: string }> };

// PUT /api/users/[id]/profile — { name, handle, bio }
export async function PUT(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { name, handle, bio } = await req.json();

    const user = await UserModel.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (typeof name === "string") user.name = name.trim().slice(0, 50);
    if (typeof bio === "string") user.bio = bio.trim().slice(0, 160);

    if (typeof handle === "string" && handle.trim()) {
      const clean = handleFrom(handle);
      // The handle is unique-indexed, so check before writing and
      // return a friendly message rather than a duplicate-key error.
      const taken = await UserModel.findOne({ handle: clean, _id: { $ne: id } }).select("_id").lean<any>();
      if (taken) return NextResponse.json({ error: `@${clean} is already taken` }, { status: 409 });
      user.handle = clean;
    }

    await user.save();

    return NextResponse.json({
      ok: true,
      user: { _id: idOf(user._id), name: user.name, handle: user.handle, bio: user.bio },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
