"use client";

import { useState, useEffect } from "react";
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
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);

  // Check localStorage for keys on mount
  useEffect(() => {
    const openai = localStorage.getItem("openai_api_key");
    const assemblyai = localStorage.getItem("assemblyai_api_key");
    setHasKeys(!!openai && !!assemblyai);
  }, []);

  // Listen for storage changes (when KeySetup saves or clears keys)
  useEffect(() => {
    function check() {
      const openai = localStorage.getItem("openai_api_key");
      const assemblyai = localStorage.getItem("assemblyai_api_key");
      setHasKeys(!!openai && !!assemblyai);
    }
    window.addEventListener("storage", check);
    // Also poll briefly to catch same-tab changes
    const interval = setInterval(check, 500);
    return () => {
      window.removeEventListener("storage", check);
      clearInterval(interval);
    };
  }, []);

  // Avoid flash before localStorage is read
  if (hasKeys === null) return null;

  // No keys: show focused setup screen
  if (!hasKeys) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-12">
        <h1 className="text-center font-serif text-[32px] leading-tight tracking-[0.01em] text-heading">
          Testimony Archive
        </h1>
        <KeySetup />
      </div>
    );
  }

  // Keys saved: show main app with settings icon in header
  return (
    <div className="mx-auto max-w-[900px] px-6 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 font-serif text-[32px] leading-tight tracking-[0.01em] text-heading">
            Testimony Archive
          </h1>
          <p className="text-muted">
            Upload audio, transcribe, translate, and identify speakers.
          </p>
        </div>
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
