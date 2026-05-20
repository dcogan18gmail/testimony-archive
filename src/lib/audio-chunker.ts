"use client";

/**
 * Audio duration probe using ffmpeg.wasm.
 *
 * Loading strategy:
 * - FFmpeg class: loaded via UMD script tag from public/ffmpeg/ffmpeg.js
 * - Core files: fetched and converted to blob URLs for COEP compatibility
 */

export type ProbeProgress = {
  stage: "loading";
  progress: number; // 0 to 1
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ffmpeg: any = null;
let ffmpegLoaded = false;

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

async function toBlobURL(url: string, mimeType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const blob = new Blob([await res.arrayBuffer()], { type: mimeType });
  return URL.createObjectURL(blob);
}

async function getFFmpeg(onProgress?: (p: ProbeProgress) => void) {
  if (ffmpeg && ffmpegLoaded) return ffmpeg;

  onProgress?.({ stage: "loading", progress: 0 });

  await loadScript("/ffmpeg/ffmpeg.js");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { FFmpeg } = (globalThis as any).FFmpegWASM;
  ffmpeg = new FFmpeg();

  onProgress?.({ stage: "loading", progress: 0.1 });

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

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot) : "";
}

/**
 * Read audio file duration in seconds (for interview metadata).
 */
export async function probeAudioDuration(
  file: File,
  onProgress?: (p: ProbeProgress) => void
): Promise<number> {
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

  const exitCode = await ff.exec(["-i", inputName, "-f", "null", "-"]);
  ff.off("log", logHandler);
  await ff.deleteFile(inputName);

  if (exitCode !== 0 && durationSeconds === 0) {
    throw new Error(`Could not read audio duration (ffmpeg exit code ${exitCode})`);
  }

  return durationSeconds;
}
