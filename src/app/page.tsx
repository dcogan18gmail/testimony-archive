"use client";

import { useState } from "react";
import KeySetup from "@/components/KeySetup";
import UploadZone from "@/components/UploadZone";
import TranscriptionPipeline from "@/components/TranscriptionPipeline";

type UploadResult = {
  interviewId: string;
  blobUrl: string;
  chunks: Uint8Array[];
  durationSeconds: number;
};

// Chunk duration matches what audio-chunker produces (30 seconds)
const CHUNK_DURATION_SECONDS = 30;

export default function Home() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 font-sans">
      <h1 className="mb-2 text-3xl font-semibold text-zinc-900">
        Transcription App
      </h1>
      <p className="mb-8 text-zinc-500">
        Upload audio, transcribe, translate, and identify speakers.
      </p>

      <div className="mb-8">
        <KeySetup />
      </div>

      <div className="mb-6">
        <UploadZone onUploadComplete={setUploadResult} />
      </div>

      {uploadResult && (
        <div className="mb-6">
          <TranscriptionPipeline
            key={uploadResult.interviewId}
            interviewId={uploadResult.interviewId}
            audioBlobUrl={uploadResult.blobUrl}
            chunks={uploadResult.chunks}
            chunkDurationSeconds={CHUNK_DURATION_SECONDS}
          />
        </div>
      )}

      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
        Interview list coming in Phase 5
      </div>
    </div>
  );
}
