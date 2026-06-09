import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// ✅ Your Cloudinary credentials (from PinkWave music app)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,   // dapvhvvmu
  api_key:    process.env.CLOUDINARY_API_KEY,       // 268989266837851
  api_secret: process.env.CLOUDINARY_API_SECRET,   // DAt5SAJSbmt0Vuq4b7SrjlFC54k
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate type
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    if (!isImage && !isAudio) {
      return NextResponse.json({ error: "Only image or audio files allowed" }, { status: 400 });
    }

    // Convert to base64 — same approach as your music app's cloudinary.uploader.upload
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary — mirrors your songController.js logic
    const result = await cloudinary.uploader.upload(dataUri, {
      folder:        isAudio ? "aarvi/audio" : "aarvi/images",
      resource_type: isAudio ? "video" : "image",   // ← Cloudinary uses "video" for audio (same as your music app)
      ...(isImage && {
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      }),
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
