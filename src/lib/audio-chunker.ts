"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CHUNK_DURATION_SECONDS = 30;

export type ChunkResult = {
  chunks: Uint8Array[];
  durationSeconds: number;
};

export type ChunkProgress = {
  stage: "loading" | "splitting";
  progress: number; // 0 to 1
};

let ffmpeg: FFmpeg | null = null;

/**
 * Get or create the singleton FFmpeg instance.
 * Loading ffmpeg.wasm is expensive (~30MB download on first load),
 * so we reuse the same instance across calls.
 */
async function getFFmpeg(onProgress?: (p: ChunkProgress) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  // Load the wasm binary from a CDN using blob URLs.
  // toBlobURL fetches the file and creates a local blob:// URL,
  // which satisfies the COEP "require-corp" header requirement
  // (regular cross-origin CDN URLs would be blocked by COEP).
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

  onProgress?.({ stage: "loading", progress: 0 });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  onProgress?.({ stage: "loading", progress: 1 });

  return ffmpeg;
}

/**
 * Split an audio file into ~30-second MP3 chunks using ffmpeg.wasm.
 *
 * How it works:
 * 1. Loads ffmpeg.wasm into the browser (if not already loaded)
 * 2. Writes the input file to ffmpeg's virtual filesystem
 * 3. Uses ffmpeg's "segment" muxer to split into 30s pieces
 * 4. Reads each chunk back as a Uint8Array
 *
 * The chunks stay in browser memory (not uploaded anywhere yet).
 * Phase 3 will send them one-at-a-time to Whisper for transcription.
 */
export async function chunkAudio(
  file: File,
  onProgress?: (p: ChunkProgress) => void
): Promise<ChunkResult> {
  const ff = await getFFmpeg(onProgress);

  // Write the uploaded file into ffmpeg's in-memory filesystem
  const inputName = "input" + getExtension(file.name);
  await ff.writeFile(inputName, await fetchFile(file));

  // First, get the duration using ffprobe-style approach:
  // Run a quick conversion to null output just to read the duration from logs.
  let durationSeconds = 0;
  const logHandler = ({ message }: { type: string; message: string }) => {
    // ffmpeg logs duration as "Duration: HH:MM:SS.xx"
    const match = message.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (match) {
      const [, hours, minutes, seconds, centiseconds] = match;
      durationSeconds =
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds) +
        Number(centiseconds) / 100;
    }
  };
  ff.on("log", logHandler);

  // Use ffmpeg's segment muxer to split the audio.
  // -f segment: use the segment output muxer
  // -segment_time 30: each segment is ~30 seconds
  // -c:a libmp3lame -b:a 128k: encode to MP3 at 128kbps
  // chunk_%03d.mp3: output pattern (chunk_000.mp3, chunk_001.mp3, etc.)
  onProgress?.({ stage: "splitting", progress: 0 });

  // Listen for progress during splitting
  const progressHandler = ({ progress }: { progress: number; time: number }) => {
    onProgress?.({ stage: "splitting", progress: Math.min(progress, 1) });
  };
  ff.on("progress", progressHandler);

  await ff.exec([
    "-i", inputName,
    "-f", "segment",
    "-segment_time", String(CHUNK_DURATION_SECONDS),
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    "chunk_%03d.mp3",
  ]);

  ff.off("log", logHandler);
  ff.off("progress", progressHandler);

  // Read all the chunk files from the virtual filesystem.
  // We list the directory and pick up every chunk_*.mp3 file.
  const files = await ff.listDir("/");
  const chunkFiles = files
    .filter((f) => !f.isDir && f.name.startsWith("chunk_") && f.name.endsWith(".mp3"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const chunks: Uint8Array[] = [];
  for (const chunkFile of chunkFiles) {
    const data = await ff.readFile(chunkFile.name);
    chunks.push(data as Uint8Array);
    // Clean up the chunk file from the virtual filesystem
    await ff.deleteFile(chunkFile.name);
  }

  // Clean up the input file too
  await ff.deleteFile(inputName);

  onProgress?.({ stage: "splitting", progress: 1 });

  return { chunks, durationSeconds };
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}
