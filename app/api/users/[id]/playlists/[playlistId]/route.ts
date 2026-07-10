import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type P = { params: Promise<{ id: string; playlistId: string }> };

// PUT: add or remove an item from a playlist. Body: { action: "add"|"remove", seriesId, episodeId? }
export async function PUT(req: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id, playlistId } = await params;
    const { action, seriesId, episodeId } = await req.json();
    if (!seriesId) return NextResponse.json({ error: "seriesId is required" }, { status: 400 });

    const user = await UserModel.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playlist = (user.playlists || []).find((p: any) => p._id.toString() === playlistId);
    if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

    if (action === "remove") {
      playlist.items = playlist.items.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (it: any) => !(it.seriesId === seriesId && (episodeId ? it.episodeId === episodeId : true))
      );
    } else {
      const exists = playlist.items.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (it: any) => it.seriesId === seriesId && it.episodeId === episodeId
      );
      if (!exists) playlist.items.push({ seriesId, episodeId, addedAt: new Date() });
    }

    await user.save();
    return NextResponse.json({ playlists: user.playlists });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// DELETE: remove an entire playlist
export async function DELETE(_: NextRequest, { params }: P) {
  try {
    await connectDB();
    const { id, playlistId } = await params;

    const user = await UserModel.findById(id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.playlists = (user.playlists || []).filter((p: any) => p._id.toString() !== playlistId);
    await user.save();

    return NextResponse.json({ playlists: user.playlists });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
