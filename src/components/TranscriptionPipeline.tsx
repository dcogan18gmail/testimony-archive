"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { transcribeAllChunks } from "@/lib/whisper";
import type { WhisperSegment } from "@/lib/whisper";
import type { AAIUtterance } from "@/lib/assemblyai";
import type { ProcessingStep } from "@/lib/types";

type PipelineProps = {
  interviewId: string;
  audioBlobUrl: string;
  chunks: Uint8Array[];
  chunkDurationSeconds: number;
};

type StepStatus = "pending" | "running" | "done" | "error";

type PipelineState = {
  whisper: StepStatus;
  assemblyai: StepStatus;
  merge: StepStatus;
  speakers: StepStatus;
  summary: StepStatus;
  whisperProgress: string;
  assemblyaiProgress: string;
  error: string | null;
  done: boolean;
};

const STEP_LABELS: Record<string, string> = {
  whisper: "Translating audio (Whisper)",
  assemblyai: "Speaker detection (AssemblyAI)",
  merge: "Merging transcripts",
  speakers: "Identifying speakers",
  summary: "Generating summary",
};

const POLL_INTERVAL = 5000;

export default function TranscriptionPipeline({
  interviewId,
  audioBlobUrl,
  chunks,
  chunkDurationSeconds,
}: PipelineProps) {
  const [state, setState] = useState<PipelineState>({
    whisper: "pending",
    assemblyai: "pending",
    merge: "pending",
    speakers: "pending",
    summary: "pending",
    whisperProgress: "",
    assemblyaiProgress: "",
    error: null,
    done: false,
  });

  const startedRef = useRef(false);

  const getKeys = useCallback(() => {
    const openaiKey = localStorage.getItem("openai_api_key");
    const assemblyaiKey = localStorage.getItem("assemblyai_api_key");
    if (!openaiKey || !assemblyaiKey) {
      throw new Error("API keys not found. Please set them above.");
    }
    return { openaiKey, assemblyaiKey };
  }, []);

  const runPipeline = useCallback(async () => {
    const { openaiKey, assemblyaiKey } = getKeys();

    // Step 1+2: Run Whisper and AssemblyAI in parallel
    setState((s) => ({
      ...s,
      whisper: "running",
      assemblyai: "running",
      whisperProgress: "0/" + chunks.length + " chunks",
      assemblyaiProgress: "Submitting...",
    }));

    // Start Whisper (client-side, directly to OpenAI)
    const whisperPromise = transcribeAllChunks(
      chunks,
      chunkDurationSeconds,
      openaiKey,
      (completed, total) => {
        setState((s) => ({
          ...s,
          whisperProgress: `${completed}/${total} chunks`,
        }));
      }
    );

    // Start AssemblyAI (via our server)
    const aaiPromise = (async () => {
      // Submit
      const startRes = await fetch("/api/assemblyai/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AssemblyAI-Key": assemblyaiKey,
        },
        body: JSON.stringify({ interviewId, audioBlobUrl }),
      });

      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.error || "Failed to start AssemblyAI");
      }

      const { transcriptId } = await startRes.json();
      setState((s) => ({ ...s, assemblyaiProgress: "Processing..." }));

      // Poll until complete
      while (true) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        const statusRes = await fetch(
          `/api/assemblyai/status?transcriptId=${transcriptId}`,
          { headers: { "X-AssemblyAI-Key": assemblyaiKey } }
        );

        if (!statusRes.ok) {
          const err = await statusRes.json();
          throw new Error(err.error || "Failed to poll AssemblyAI");
        }

        const result = await statusRes.json();

        if (result.status === "completed") {
          return {
            utterances: result.utterances as AAIUtterance[],
            detectedLanguage: result.detectedLanguage as string | null,
          };
        }

        if (result.status === "error") {
          throw new Error(result.error || "AssemblyAI transcription failed");
        }

        setState((s) => ({
          ...s,
          assemblyaiProgress: `Status: ${result.status}`,
        }));
      }
    })();

    // Wait for both to complete
    let whisperSegments: WhisperSegment[];
    let aaiUtterances: AAIUtterance[];
    let detectedLanguage: string | null;

    try {
      const [whisperResult, aaiResult] = await Promise.all([
        whisperPromise,
        aaiPromise,
      ]);
      whisperSegments = whisperResult;
      aaiUtterances = aaiResult.utterances;
      detectedLanguage = aaiResult.detectedLanguage;
      setState((s) => ({ ...s, whisper: "done", assemblyai: "done" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transcription failed";
      setState((s) => ({
        ...s,
        whisper: s.whisper === "running" ? "error" : s.whisper,
        assemblyai: s.assemblyai === "running" ? "error" : s.assemblyai,
        error: message,
      }));
      return;
    }

    // Step 3: Merge
    setState((s) => ({ ...s, merge: "running" }));
    try {
      const mergeRes = await fetch("/api/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          whisperSegments,
          aaiUtterances,
          detectedLanguage,
        }),
      });

      if (!mergeRes.ok) {
        const err = await mergeRes.json();
        throw new Error(err.error || "Failed to merge transcripts");
      }

      setState((s) => ({ ...s, merge: "done" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Merge failed";
      setState((s) => ({ ...s, merge: "error", error: message }));
      return;
    }

    // Step 4: Identify speakers
    setState((s) => ({ ...s, speakers: "running" }));
    try {
      const speakersRes = await fetch("/api/identify-speakers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": openaiKey,
        },
        body: JSON.stringify({ interviewId }),
      });

      if (!speakersRes.ok) {
        const err = await speakersRes.json();
        throw new Error(err.error || "Failed to identify speakers");
      }

      setState((s) => ({ ...s, speakers: "done" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speaker identification failed";
      setState((s) => ({ ...s, speakers: "error", error: message }));
      return;
    }

    // Step 5: Summarize
    setState((s) => ({ ...s, summary: "running" }));
    try {
      const summaryRes = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": openaiKey,
        },
        body: JSON.stringify({ interviewId }),
      });

      if (!summaryRes.ok) {
        const err = await summaryRes.json();
        throw new Error(err.error || "Failed to generate summary");
      }

      setState((s) => ({ ...s, summary: "done", done: true }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Summary failed";
      setState((s) => ({ ...s, summary: "error", error: message }));
    }
  }, [interviewId, audioBlobUrl, chunks, chunkDurationSeconds, getKeys]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runPipeline();
  }, [runPipeline]);

  const steps = ["whisper", "assemblyai", "merge", "speakers", "summary"] as const;

  return (
    <div className="w-full rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-[13px] font-semibold text-heading">
        {state.done ? "Transcription complete" : "Processing transcript..."}
      </h3>

      <div className="space-y-3">
        {steps.map((step) => {
          const status = state[step] as StepStatus;
          const label = STEP_LABELS[step];
          const progress =
            step === "whisper"
              ? state.whisperProgress
              : step === "assemblyai"
                ? state.assemblyaiProgress
                : "";

          return (
            <div key={step} className="flex items-center gap-3">
              {/* Status icon */}
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {status === "pending" && (
                  <div className="h-2 w-2 rounded-full bg-faint" />
                )}
                {status === "running" && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
                )}
                {status === "done" && (
                  <svg
                    className="h-5 w-5 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {status === "error" && (
                  <svg
                    className="h-5 w-5 text-error"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>

              {/* Label and progress */}
              <div className="flex-1">
                <span
                  className={`text-[13px] ${
                    status === "done"
                      ? "text-muted"
                      : status === "error"
                        ? "text-error"
                        : status === "running"
                          ? "font-medium text-heading"
                          : "text-faint"
                  }`}
                >
                  {label}
                </span>
                {progress && status === "running" && (
                  <span className="ml-2 text-[11px] text-faint">{progress}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error display */}
      {state.error && (
        <div className="mt-4 rounded-md bg-error/10 p-3">
          <p className="text-[13px] text-error">{state.error}</p>
        </div>
      )}

      {/* Done message */}
      {state.done && (
        <div className="mt-4 rounded-md bg-success/10 p-3">
          <p className="text-[13px] text-success">
            All done! Your transcript is ready to view.
          </p>
          <a
            href={`/interviews/${interviewId}`}
            className="mt-2 inline-block text-[13px] font-medium text-success underline hover:opacity-80"
          >
            View Transcript &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
