"use client";

import { useState, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { chunkAudio, type ChunkProgress } from "@/lib/audio-chunker";
import { ACCEPTED_AUDIO_TYPES_SET, MAX_FILE_SIZE } from "@/lib/upload-constants";
import ProcessingStatus, { type UploadStage } from "./ProcessingStatus";

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
    if (!ACCEPTED_AUDIO_TYPES_SET.has(file.type)) {
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
      const onChunkProgress = (p: ChunkProgress) => {
        setStage(p.stage);
        setProgress(p.progress);
      };
      const { chunks, durationSeconds } = await chunkAudio(file, onChunkProgress);

      // Step 2: Upload the full file to Vercel Blob
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

      setStage("done");
      setProgress(1);

      onUploadComplete?.({ interviewId, blobUrl: blob.url, chunks, durationSeconds });
    } catch (err) {
      console.error("Upload flow failed:", err);
      setStage("error");
      const message = err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err);
      setError(message || "Upload failed (unknown error)");
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
            className="mt-3 text-[13px] text-muted hover:text-body transition-colors"
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
          ? "border-accent bg-subtle"
          : "border-border hover:border-border-hover"
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
        className="mx-auto mb-3 h-10 w-10 text-faint"
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

      <p className="mb-1 text-[13px] font-medium text-body">
        Drop an audio file here, or click to browse
      </p>
      <p className="text-[11px] text-faint">
        MP3, WAV, M4A, FLAC, OGG, or WebM (max 500MB)
      </p>
    </div>
  );
}
