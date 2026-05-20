"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import KeySetup from "@/components/KeySetup";
import UploadZone from "@/components/UploadZone";
import TranscriptionPipeline from "@/components/TranscriptionPipeline";
import InterviewList from "@/components/InterviewList";

type UploadResult = {
  interviewId: string;
  blobUrl: string;
  durationSeconds: number;
};

export default function Home() {
  const { data: session } = useSession();
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [hasKeys, setHasKeys] = useState<boolean | null>(null);

  useEffect(() => {
    const openai = localStorage.getItem("openai_api_key");
    const assemblyai = localStorage.getItem("assemblyai_api_key");
    setHasKeys(!!openai && !!assemblyai);
  }, []);

  useEffect(() => {
    function check() {
      const openai = localStorage.getItem("openai_api_key");
      const assemblyai = localStorage.getItem("assemblyai_api_key");
      setHasKeys(!!openai && !!assemblyai);
    }
    window.addEventListener("storage", check);
    const interval = setInterval(check, 500);
    return () => {
      window.removeEventListener("storage", check);
      clearInterval(interval);
    };
  }, []);

  if (hasKeys === null) return null;

  if (!hasKeys) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-[32px] leading-tight tracking-[0.01em] text-heading">
            Testimony Archive
          </h1>
          {session?.user && (
            <button
              onClick={() => signOut()}
              className="text-[13px] text-muted hover:text-body transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
        <KeySetup />
      </div>
    );
  }

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
        <div className="flex items-center gap-4">
          <KeySetup />
          {session?.user && (
            <button
              onClick={() => signOut()}
              className="text-[13px] text-muted hover:text-body transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
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
          />
        </div>
      )}

      <InterviewList />
    </div>
  );
}
