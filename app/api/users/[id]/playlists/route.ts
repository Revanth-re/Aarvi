import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type P = { params: Promise<{ id: string }> };

// GET: list this user's playlists
export async function GET(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const user = await UserModel.findById(id).lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ playlists: user.playlists || [] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// POST: create a new playlist, optionally seeding it with one item
export async function POST(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id } = await params;
    const { name, seriesId, episodeId } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
    }

    const user = await UserModel.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    user.playlists = user.playlists || [];
    user.playlists.push({
      name: String(name).trim(),
      items: seriesId ? [{ seriesId, episodeId, addedAt: new Date() }] : [],
      createdAt: new Date(),
    });
    await user.save();

    return NextResponse.json({ playlists: user.playlists }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
