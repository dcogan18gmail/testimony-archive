"use client";

import { useState } from "react";
import KeySetup from "@/components/KeySetup";
import UploadZone from "@/components/UploadZone";
import TranscriptionPipeline from "@/components/TranscriptionPipeline";
import InterviewList from "@/components/InterviewList";

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
    <div className="mx-auto max-w-[900px] px-6 py-12">
      <h1 className="mb-2 font-serif text-[32px] leading-tight tracking-[0.01em] text-heading">
        Testimony Archive
      </h1>
      <p className="mb-8 text-muted">
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

      <InterviewList />
    </div>
  );
}
