/**
 * Downloads ffmpeg-core.wasm to public/ffmpeg/ if it doesn't exist.
 * Runs automatically after `npm install` via the postinstall script.
 *
 * The wasm file is ~31MB so we don't commit it to git.
 * The JS files (ffmpeg.js, 814.ffmpeg.js, ffmpeg-core.js) are small
 * enough to commit and are already in public/ffmpeg/.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = join(__dirname, "..", "public", "ffmpeg", "ffmpeg-core.wasm");

if (existsSync(dest)) {
  console.log("ffmpeg-core.wasm already exists, skipping download.");
  process.exit(0);
}

const url = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm";
console.log("Downloading ffmpeg-core.wasm (~31MB)...");

mkdirSync(dirname(dest), { recursive: true });

const res = await fetch(url);
if (!res.ok) {
  console.error(`Failed to download: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const buffer = Buffer.from(await res.arrayBuffer());
writeFileSync(dest, buffer);
console.log(`Downloaded ffmpeg-core.wasm (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
