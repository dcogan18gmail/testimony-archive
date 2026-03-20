"use client";

import { useState, useEffect } from "react";
import type { ProcessingStep } from "@/lib/types";

type ProcessingViewProps = {
  interviewId: string;
  currentStep: string | null;
};

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: "transcribing", label: "Transcribing audio" },
  { key: "merging", label: "Merging transcripts" },
  { key: "identifying_speakers", label: "Identifying speakers" },
  { key: "summarizing", label: "Generating summary" },
  { key: "finalizing", label: "Finalizing" },
];

const STEP_ORDER: Record<string, number> = {};
STEPS.forEach((s, i) => {
  STEP_ORDER[s.key] = i;
});

export default function ProcessingView({
  interviewId,
  currentStep: initialStep,
}: ProcessingViewProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [status, setStatus] = useState<string>("processing");

  // Poll for status updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/interviews/${interviewId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        setCurrentStep(data.currentStep);
        setStatus(data.status);

        if (data.status === "completed" || data.status === "error") {
          clearInterval(interval);
          // Reload to show the full view
          window.location.reload();
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [interviewId]);

  const currentIndex = currentStep ? (STEP_ORDER[currentStep] ?? -1) : -1;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 font-sans">
      <a
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        &larr; Back to home
      </a>

      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
        <h1 className="mb-1 text-lg font-semibold text-zinc-900">
          Processing your transcript...
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          This page will update automatically when processing is complete.
        </p>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            let stepStatus: "done" | "running" | "pending" = "pending";
            if (i < currentIndex) stepStatus = "done";
            else if (i === currentIndex) stepStatus = status === "error" ? "done" : "running";

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {stepStatus === "done" && (
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {stepStatus === "running" && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                  )}
                  {stepStatus === "pending" && (
                    <div className="h-2 w-2 rounded-full bg-zinc-300" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    stepStatus === "done"
                      ? "text-zinc-500"
                      : stepStatus === "running"
                        ? "font-medium text-zinc-900"
                        : "text-zinc-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
