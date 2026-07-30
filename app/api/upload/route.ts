import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin } from "@/lib/requireAdmin";
import { requireUser } from "@/lib/requireUser";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: { bodyParser: { sizeLimit: "50mb" } },
};

// Any logged-in user can upload here now — not just admins — since
// creators need to upload their own cover art and episode audio, and
// anyone posting a Story attaches a photo/audio clip too. Admins keep
// using their existing x-user-email header (adminFetch); everyone else
// is checked via x-user-id (requireUser) resolving to a real account.
// There's no per-file size/rate limiting beyond the 50mb body cap
// below, which is fine for a demo but worth revisiting before opening
// this up to a large public userbase.
export async function POST(request: NextRequest) {
  const isAdmin = !requireAdmin(request);
  if (!isAdmin) {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // image/gif is covered by isImage — GIFs need no special handling,
    // an <img> tag animates them natively. Video is for DM attachments
    // (recorded clips, screen shares, etc.), separate from the audio
    // upload path used for episodes/story audio.
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isAudio && !isVideo) {
      return NextResponse.json({ error: "Only image, video, or audio files allowed" }, { status: 400 });
    }

    const bytes   = await file.arrayBuffer();
    const base64  = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:        isAudio ? "aarvi/audio" : isVideo ? "swara/video" : "aarvi/images",
      resource_type: (isAudio || isVideo) ? "video" : "image",
      ...(isImage && { transformation: [{ quality: "auto", fetch_format: "auto" }] }),
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
