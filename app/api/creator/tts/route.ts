import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireUser } from "@/lib/requireUser";
import { synthesizeSpeech, MAX_NARRATION_CHARS } from "@/lib/tts";
import { NARRATION_VOICES } from "@/types";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Voice narration can take a while for longer chapters (TTS
// generation + Cloudinary upload), same reasoning as the transcript
// route's extended timeout in app/api/series/route.ts.
export const maxDuration = 300;

const VOICE_KEYS = new Set(NARRATION_VOICES.map(v => v.key));

// POST /api/creator/tts — { text, voice } → { url, duration }
// Turns creator-written text into narrated audio via Gemini TTS and
// hosts it on Cloudinary exactly like an uploaded file, so everything
// downstream (player, transcript generation, drafts) treats it
// identically to a normal episode upload.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { text, voice } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    if (text.trim().length > MAX_NARRATION_CHARS) {
      return NextResponse.json(
        { error: `Text is too long to narrate in one go (max ${MAX_NARRATION_CHARS} characters).` },
        { status: 400 }
      );
    }
    if (typeof voice !== "string" || !VOICE_KEYS.has(voice)) {
      return NextResponse.json({ error: "Choose a valid voice" }, { status: 400 });
    }

    const { wav, durationSeconds } = await synthesizeSpeech(text, voice);

    const dataUri = `data:audio/wav;base64,${wav.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "aarvi/audio",
      resource_type: "video", // Cloudinary treats audio as "video" resources, same as /api/upload
    });

    return NextResponse.json({ url: result.secure_url, duration: durationSeconds });
  } catch (e) {
    console.error("TTS generation error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
