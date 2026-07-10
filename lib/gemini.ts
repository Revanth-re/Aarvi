// Auto-generates a timestamped transcript for an episode's audio using
// the Gemini API. Flow: download the audio bytes from Cloudinary →
// upload them to Gemini's Files API (resumable upload) → wait for
// Gemini to finish processing the file → ask it to transcribe with
// per-segment timestamps → parse the response into {text,start,end}
// segments used for the karaoke-style highlighted transcript view.
//
// Audio can't be referenced by a plain external URL in Gemini's API
// (only text/pdf/image/video are supported that way) — audio always
// has to go through the Files API upload step.

const GEMINI_BASE = "https://generativelanguage.googleapis.com";

export interface TranscriptSegment { text: string; start: number; end: number; }

function mmssToSeconds(mmss: string): number {
  const parts = mmss.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function guessMimeType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav",
    ogg: "audio/ogg", flac: "audio/flac", aac: "audio/aac", webm: "audio/webm",
  };
  return map[ext || ""] || "audio/mpeg";
}

async function uploadToGemini(buf: Buffer, mimeType: string, apiKey: string): Promise<{ uri: string; name: string; mimeType: string }> {
  const startRes = await fetch(`${GEMINI_BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(buf.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: `episode-${Date.now()}` } }),
  });
  if (!startRes.ok) throw new Error(`Gemini upload init failed: ${startRes.status} ${await startRes.text()}`);
  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini upload init didn't return an upload URL");

  // `fetch`'s BodyInit type doesn't structurally accept Node's `Buffer`
  // directly (the installed @types/node's `Buffer<ArrayBufferLike>`
  // generic doesn't line up with the plain ArrayBufferView the DOM
  // fetch types expect) — wrapping in a plain Uint8Array satisfies it
  // without copying the underlying bytes.
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(buf.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(buf),
  });
  if (!uploadRes.ok) throw new Error(`Gemini upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  const data = await uploadRes.json();
  const file = data?.file;
  if (!file?.uri || !file?.name) throw new Error("Gemini upload didn't return a file URI/name");
  return { uri: file.uri, name: file.name, mimeType: file.mimeType || file.mime_type || mimeType };
}

async function waitUntilActive(fileName: string, apiKey: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${GEMINI_BASE}/v1beta/${fileName}`, { headers: { "x-goog-api-key": apiKey } });
    const data = await res.json();
    const state = data?.state;
    if (state === "ACTIVE") return;
    if (state === "FAILED") throw new Error("Gemini failed to process the uploaded audio file");
    await new Promise(r => setTimeout(r, 3000));
  }
  // Not fatal — Gemini will usually still accept a generateContent call
  // for a file still finishing up; if it truly isn't ready, that call
  // will fail with its own clear error.
}

export async function transcribeAudioWithGemini(audioUrl: string): Promise<TranscriptSegment[]> {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "gemini-2.5-flash";
  if (!apiKey) throw new Error("LLM_API_KEY is not set");

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`Couldn't download audio from ${audioUrl}: ${audioRes.status}`);
  const buf = Buffer.from(await audioRes.arrayBuffer());
  const mimeType = audioRes.headers.get("content-type") || guessMimeType(audioUrl);

  const file = await uploadToGemini(buf, mimeType, apiKey);
  await waitUntilActive(file.name, apiKey);

  const prompt = `Transcribe this audio in full, start to finish. Break it into short natural phrases or sentences (roughly 3-10 seconds of speech each). Output ONLY plain text, one segment per line, in exactly this format with no extra commentary, no markdown, no numbering:
[MM:SS-MM:SS] transcript text for that segment

Example:
[00:00-00:04] Welcome back to the story.
[00:04-00:09] Tonight we continue right where we left off.`;

  const genRes = await fetch(`${GEMINI_BASE}/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { file_data: { mime_type: file.mimeType, file_uri: file.uri } },
        ],
      }],
      generationConfig: { audioTimestamp: true },
    }),
  });
  if (!genRes.ok) throw new Error(`Gemini transcription request failed: ${genRes.status} ${await genRes.text()}`);
  const genData = await genRes.json();

  // Best-effort cleanup — no need to keep the file around once we have
  // the transcript (it would auto-expire in 48h anyway).
  fetch(`${GEMINI_BASE}/v1beta/${file.name}`, { method: "DELETE", headers: { "x-goog-api-key": apiKey } }).catch(() => {});

  const candidate = genData?.candidates?.[0];
  if (!candidate) throw new Error(`Gemini returned no candidates: ${JSON.stringify(genData).slice(0, 500)}`);
  const text: string = (candidate.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");

  const lineRe = /\[(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.+)/;
  const segments: TranscriptSegment[] = [];
  for (const line of text.split("\n")) {
    const m = line.trim().match(lineRe);
    if (!m) continue;
    const [, startStr, endStr, segText] = m;
    const start = mmssToSeconds(startStr);
    const end = mmssToSeconds(endStr);
    const cleanText = segText.trim();
    if (cleanText && end >= start) segments.push({ text: cleanText, start, end });
  }
  return segments;
}

// Given a set of episodes being saved (from the admin form) and, for
// edits, the episodes as they currently exist in the DB, generate
// transcripts only for episodes that are new or whose audio actually
// changed — so re-saving a series doesn't re-transcribe everything
// every time. Runs episodes concurrently; one episode's failure never
// blocks the others or the series save itself.
export async function processEpisodeTranscripts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  episodes: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const existingById = new Map((existing || []).map((e) => [String(e._id), e]));

  const results = await Promise.allSettled(
    episodes.map(async (ep) => {
      if (!ep.audioUrl) return { ...ep, transcriptSegments: ep.transcriptSegments || [], transcriptStatus: ep.transcriptStatus || "none" };

      const prev = ep._id ? existingById.get(String(ep._id)) : undefined;
      const audioChanged = !prev || prev.audioUrl !== ep.audioUrl;
      if (!audioChanged && prev?.transcriptSegments?.length > 0) {
        return { ...ep, transcriptSegments: prev.transcriptSegments, transcriptStatus: prev.transcriptStatus || "ready" };
      }

      try {
        const segments = await transcribeAudioWithGemini(ep.audioUrl);
        return { ...ep, transcriptSegments: segments, transcriptStatus: segments.length > 0 ? "ready" : "failed" };
      } catch (e) {
        console.error(`Transcript generation failed for episode "${ep.title}":`, e);
        return { ...ep, transcriptSegments: prev?.transcriptSegments || [], transcriptStatus: "failed" };
      }
    })
  );

  return results.map((r, i) => (r.status === "fulfilled" ? r.value : episodes[i]));
}
