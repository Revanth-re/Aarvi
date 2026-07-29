import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ShortModel } from "@/models/Short";

type P = { params: Promise<{ id: string }> };

// POST /api/shorts/[id]/save — toggle the bookmark.
// Saved shorts surface in Library → Saved.
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const s = await ShortModel.findById(id);
    if (!s) return NextResponse.json({ error: "Short not found" }, { status: 404 });

    const savedBy: string[] = s.savedBy || [];
    const had = savedBy.includes(userId);
    s.savedBy = had ? savedBy.filter((u: string) => u !== userId) : [...savedBy, userId];
    await s.save();

    return NextResponse.json({ saved: !had });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
