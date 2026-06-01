import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const p = req.nextUrl.searchParams;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {};
    if (p.get("category") && p.get("category") !== "all") q.category = p.get("category");
    if (p.get("search")) {
      const rx = new RegExp(p.get("search")!, "i");
      q.$or = [{ name: rx }, { description: rx }, { tags: { $in: [rx] } }];
    }
    const limit = parseInt(p.get("limit") || "50");
    const data = await ProductModel.find(q).limit(limit).lean();
    return NextResponse.json(data);
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const doc = await ProductModel.create(body);
    return NextResponse.json(doc, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
