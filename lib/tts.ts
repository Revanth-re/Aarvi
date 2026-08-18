/* eslint-disable @typescript-eslint/no-explicit-any */
// Text-to-speech narration for Creator Studio's "generate voice
// narration" publishing path (see app/api/creator/tts/route.ts).
// Uses the same Gemini account/API key as lib/gemini.ts (transcript
// generation) — just a different, TTS-capable model.
//
// Gemini's TTS models return raw signed 16-bit PCM, mono, 24kHz — not
// a playable file on its own — so this wraps it in a standard WAV
// header before it goes anywhere near Cloudinary or an <audio> tag.

const GEMINI_BASE = "https://generativelanguage.googleapis.com";
const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2; // 16-bit signed PCM

export interface NarrationResult { wav: Buffer; durationSeconds: number; }

function pcmToWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE;
  const blockAlign = CHANNELS * BYTES_PER_SAMPLE;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);                    // PCM fmt chunk size
  header.writeUInt16LE(1, 20);                     // audio format = PCM
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34);  // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

// The API caps combined text+prompt at 8,000 bytes and generated audio
// at roughly 655 seconds — this stays comfortably under both so a full
// chapter fits in one request without a confusing mid-API rejection.
export const MAX_NARRATION_CHARS = 6000;

export async function synthesizeSpeech(text: string, voiceName: string): Promise<NarrationResult> {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.TTS_MODEL || "gemini-3.1-flash-tts-preview";
  if (!apiKey) throw new Error("LLM_API_KEY is not set");

  const trimmed = text.trim();
  if (!trimmed) throw new Error("No text to narrate");
  if (trimmed.length > MAX_NARRATION_CHARS) {
    throw new Error(`Text is too long to narrate in one go (max ${MAX_NARRATION_CHARS} characters).`);
  }

  const res = await fetch(`${GEMINI_BASE}/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: trimmed }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini TTS request failed: ${res.status} ${await res.text()}`);
  const data = await res.json();

  const part = (data?.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData?.data);
  const b64 = part?.inlineData?.data;
  if (!b64) throw new Error(`Gemini TTS returned no audio: ${JSON.stringify(data).slice(0, 500)}`);

  const pcm = Buffer.from(b64, "base64");
  const wav = pcmToWav(pcm);
  const durationSeconds = Math.round(pcm.length / (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE));

  return { wav, durationSeconds };
}
