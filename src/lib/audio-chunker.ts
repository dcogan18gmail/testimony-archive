"use client";

/**
 * Audio chunker using ffmpeg.wasm.
 *
 * Loading strategy:
 * - FFmpeg class: loaded via UMD script tag from public/ffmpeg/ffmpeg.js
 * - Worker (814.ffmpeg.js): auto-loaded by the UMD build from same directory
 * - Core files (ffmpeg-core.js, ffmpeg-core.wasm): fetched and converted
 *   to blob URLs, then passed to ffmpeg.load()
 *
 * Why blob URLs for core files? The UMD worker uses importScripts() to
 * load ffmpeg-core.js. Under our COEP headers, importScripts() can fail
 * even for same-origin resources. Blob URLs are always same-origin and
 * bypass COEP restrictions entirely.
 */

const CHUNK_DURATION_SECONDS = 30;

export type ChunkResult = {
  chunks: Uint8Array[];
  durationSeconds: number;
};

export type ChunkProgress = {
  stage: "loading" | "splitting";
  progress: number; // 0 to 1
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ffmpeg: any = null;
let ffmpegLoaded = false;

/** Load a script tag and wait for it to finish. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/** Fetch a URL and return a blob:// URL. */
async function toBlobURL(url: string, mimeType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const blob = new Blob([await res.arrayBuffer()], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Get or create the singleton FFmpeg instance.
 */
async function getFFmpeg(onProgress?: (p: ChunkProgress) => void) {
  if (ffmpeg && ffmpegLoaded) return ffmpeg;

  onProgress?.({ stage: "loading", progress: 0 });

  // Load the UMD build via script tag → sets window.FFmpegWASM
  await loadScript("/ffmpeg/ffmpeg.js");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { FFmpeg } = (globalThis as any).FFmpegWASM;
  ffmpeg = new FFmpeg();

  onProgress?.({ stage: "loading", progress: 0.1 });

  // Fetch core files and convert to blob URLs.
  // The worker uses importScripts() to load these, and blob URLs
  // guarantee same-origin access regardless of COEP headers.
  const [coreURL, wasmURL] = await Promise.all([
    toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
    toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
  ]);

  onProgress?.({ stage: "loading", progress: 0.7 });

  await ffmpeg.load({ coreURL, wasmURL });

  ffmpegLoaded = true;
  onProgress?.({ stage: "loading", progress: 1 });

  return ffmpeg;
}

/**
 * Split an audio file into ~30-second MP3 chunks using ffmpeg.wasm.
 */
export async function chunkAudio(
  file: File,
  onProgress?: (p: ChunkProgress) => void
): Promise<ChunkResult> {
  const ff = await getFFmpeg(onProgress);

  const inputName = "input" + getExtension(file.name);
  const fileData = new Uint8Array(await file.arrayBuffer());
  await ff.writeFile(inputName, fileData);

  let durationSeconds = 0;
  const logHandler = ({ message }: { type: string; message: string }) => {
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

  onProgress?.({ stage: "splitting", progress: 0 });

  const progressHandler = ({ progress }: { progress: number; time: number }) => {
    onProgress?.({ stage: "splitting", progress: Math.min(progress, 1) });
  };
  ff.on("progress", progressHandler);

  const exitCode = await ff.exec([
    "-i", inputName,
    "-f", "segment",
    "-segment_time", String(CHUNK_DURATION_SECONDS),
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    "chunk_%03d.mp3",
  ]);

  ff.off("log", logHandler);
  ff.off("progress", progressHandler);

  if (exitCode !== 0) {
    throw new Error(`Audio splitting failed (ffmpeg exit code ${exitCode})`);
  }

  const files = await ff.listDir("/");
  const chunkFiles = files
    .filter((f: { isDir: boolean; name: string }) =>
      !f.isDir && f.name.startsWith("chunk_") && f.name.endsWith(".mp3")
    )
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

  const chunks: Uint8Array[] = [];
  for (const chunkFile of chunkFiles) {
    const data = await ff.readFile(chunkFile.name);
    chunks.push(data as Uint8Array);
    await ff.deleteFile(chunkFile.name);
  }

  await ff.deleteFile(inputName);
  onProgress?.({ stage: "splitting", progress: 1 });

  return { chunks, durationSeconds };
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}
