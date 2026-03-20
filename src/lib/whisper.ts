// Types for Whisper response
export type WhisperSegment = {
  start: number;
  end: number;
  text: string;
};

/**
 * Transcribe a single audio chunk via OpenAI Whisper translations endpoint.
 * Uses raw fetch (runs in browser, key goes directly to OpenAI).
 * Returns segments with timestamps offset by chunkOffsetSeconds.
 */
export async function transcribeChunk(
  chunkData: Uint8Array,
  chunkIndex: number,
  chunkOffsetSeconds: number,
  openaiKey: string
): Promise<WhisperSegment[]> {
  const formData = new FormData();
  formData.append("file", new Blob([chunkData.slice().buffer as ArrayBuffer], { type: "audio/mpeg" }), `chunk_${chunkIndex}.mp3`);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/translations", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Whisper API error: ${res.status}`);
  }

  const data = await res.json();

  return (data.segments || []).map((seg: { start: number; end: number; text: string }) => ({
    start: Math.round((seg.start + chunkOffsetSeconds) * 100) / 100,
    end: Math.round((seg.end + chunkOffsetSeconds) * 100) / 100,
    text: seg.text.trim(),
  }));
}

/**
 * Transcribe all chunks sequentially. Returns all segments sorted by start time.
 * chunkDurationSeconds is how long each chunk is (e.g. 30).
 */
export async function transcribeAllChunks(
  chunks: Uint8Array[],
  chunkDurationSeconds: number,
  openaiKey: string,
  onProgress?: (completed: number, total: number) => void
): Promise<WhisperSegment[]> {
  const allSegments: WhisperSegment[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const offset = i * chunkDurationSeconds;
    const segments = await transcribeChunk(chunks[i], i, offset, openaiKey);
    allSegments.push(...segments);
    onProgress?.(i + 1, chunks.length);
  }

  return allSegments.sort((a, b) => a.start - b.start);
}
