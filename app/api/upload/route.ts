import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
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
// creators need to upload their own cover art and episode audio. The
// only gate is that x-user-id has to resolve to a real account (see
// requireUser); there's no per-file size/rate limiting beyond the 50mb
// body cap below, which is fine for a demo but worth revisiting before
// opening this up to a large public userbase.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    if (!isImage && !isAudio) return NextResponse.json({ error: "Only image or audio files allowed" }, { status: 400 });

    const bytes   = await file.arrayBuffer();
    const base64  = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:        isAudio ? "aarvi/audio" : "aarvi/images",
      resource_type: isAudio ? "video" : "image",
      ...(isImage && { transformation: [{ quality: "auto", fetch_format: "auto" }] }),
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
