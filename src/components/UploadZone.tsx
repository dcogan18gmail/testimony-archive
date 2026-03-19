"use client";

import { useState, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { chunkAudio, type ChunkProgress } from "@/lib/audio-chunker";
import ProcessingStatus, { type UploadStage } from "./ProcessingStatus";

// Accepted audio MIME types (must match /api/upload allowedContentTypes)
const ACCEPTED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/x-m4a",
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Drag-and-drop upload zone.
 *
 * When a user drops (or selects) an audio file, this component:
 * 1. Validates file type and size
 * 2. Runs ffmpeg.wasm to split it into ~30s MP3 chunks
 * 3. Uploads the full file to Vercel Blob (client upload)
 * 4. POSTs to /api/interviews to create a DB row
 * 5. Stores chunks + interviewId in state (for Phase 3)
 */

type UploadResult = {
  interviewId: string;
  blobUrl: string;
  chunks: Uint8Array[];
  durationSeconds: number;
};

type Props = {
  onUploadComplete?: (result: UploadResult) => void;
};

export default function UploadZone({ onUploadComplete }: Props) {
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [filename, setFilename] = useState<string>();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = stage !== null && stage !== "done" && stage !== "error";

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!ACCEPTED_TYPES.has(file.type)) {
      setStage("error");
      setError(`Unsupported file type: ${file.type || "unknown"}. Use MP3, WAV, M4A, FLAC, OGG, or WebM.`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setStage("error");
      setError(`File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 500MB.`);
      return;
    }

    setFilename(file.name);
    setError(undefined);

    try {
      // Step 1: Split audio into chunks using ffmpeg.wasm
      // This downloads ffmpeg (~30MB) on first use, then splits the audio
      // into ~30-second MP3 chunks held in browser memory.
      const onChunkProgress = (p: ChunkProgress) => {
        setStage(p.stage);
        setProgress(p.progress);
      };
      const { chunks, durationSeconds } = await chunkAudio(file, onChunkProgress);

      // Step 2: Upload the full file to Vercel Blob
      // The browser uploads directly to Blob storage. Our /api/upload route
      // only handles token exchange (no file bytes pass through the server).
      setStage("uploading");
      setProgress(0);

      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: ({ percentage }) => {
          setProgress(percentage / 100);
        },
      });

      // Step 3: Create the interview row in the database
      // We send the blob URL and filename to our server, which creates
      // a row and returns the interview ID.
      setStage("creating");
      setProgress(1);

      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          blobUrl: blob.url,
          durationSeconds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create interview");
      }

      const { id: interviewId } = await res.json();

      // Done! The browser now holds:
      // - chunks[] (Uint8Array[]) for Phase 3 transcription
      // - interviewId to attach results to
      // - blobUrl for the full audio file
      setStage("done");
      setProgress(1);

      onUploadComplete?.({ interviewId, blobUrl: blob.url, chunks, durationSeconds });
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  // If processing or done, show the status display instead of the drop zone
  if (stage !== null) {
    return (
      <div>
        <ProcessingStatus
          stage={stage}
          progress={progress}
          error={error}
          filename={filename}
        />
        {(stage === "done" || stage === "error") && (
          <button
            onClick={() => {
              setStage(null);
              setProgress(0);
              setError(undefined);
              setFilename(undefined);
            }}
            className="mt-3 text-sm text-zinc-500 hover:text-zinc-700"
          >
            {stage === "error" ? "Try again" : "Upload another file"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragOver
          ? "border-zinc-900 bg-zinc-50"
          : "border-zinc-300 hover:border-zinc-400"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileInput}
        className="hidden"
      />

      <svg
        className="mx-auto mb-3 h-10 w-10 text-zinc-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      <p className="mb-1 text-sm font-medium text-zinc-700">
        Drop an audio file here, or click to browse
      </p>
      <p className="text-xs text-zinc-400">
        MP3, WAV, M4A, FLAC, OGG, or WebM (max 500MB)
      </p>
    </div>
  );
}
