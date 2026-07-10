import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { requireAdmin } from "@/lib/requireAdmin";

type P = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const doc = await ProductModel.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: P) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const doc = await ProductModel.findByIdAndUpdate(id, body, { new: true }).lean();
    return NextResponse.json(doc);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: P) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await connectDB();
    const { id } = await params;
    await ProductModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
