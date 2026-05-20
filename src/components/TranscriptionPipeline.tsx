"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AAIUtterance } from "@/lib/assemblyai";

type PipelineProps = {
  interviewId: string;
  audioBlobUrl: string;
};

type StepStatus = "pending" | "running" | "done" | "error";

type PipelineState = {
  transcribe: StepStatus;
  speakers: StepStatus;
  summary: StepStatus;
  transcribeProgress: string;
  error: string | null;
  done: boolean;
};

const STEP_LABELS: Record<string, string> = {
  transcribe: "Transcribing & translating (AssemblyAI)",
  speakers: "Identifying speakers",
  summary: "Generating summary",
};

const POLL_INTERVAL = 5000;

export default function TranscriptionPipeline({
  interviewId,
  audioBlobUrl,
}: PipelineProps) {
  const [state, setState] = useState<PipelineState>({
    transcribe: "pending",
    speakers: "pending",
    summary: "pending",
    transcribeProgress: "",
    error: null,
    done: false,
  });

  const startedRef = useRef(false);

  const getKeys = useCallback(() => {
    const openaiKey = localStorage.getItem("openai_api_key");
    const assemblyaiKey = localStorage.getItem("assemblyai_api_key");
    if (!assemblyaiKey) {
      throw new Error("AssemblyAI API key not found. Please set it in settings.");
    }
    if (!openaiKey) {
      throw new Error("OpenAI API key not found. Please set it in settings.");
    }
    return { openaiKey, assemblyaiKey };
  }, []);

  const runPipeline = useCallback(async () => {
    const { openaiKey, assemblyaiKey } = getKeys();

    setState((s) => ({
      ...s,
      transcribe: "running",
      transcribeProgress: "Submitting...",
    }));

    let utterances: AAIUtterance[];
    let detectedLanguage: string | null;

    try {
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
        throw new Error(err.error || "Failed to start transcription");
      }

      const { transcriptId } = await startRes.json();
      setState((s) => ({ ...s, transcribeProgress: "Processing..." }));

      while (true) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        const statusRes = await fetch(
          `/api/assemblyai/status?transcriptId=${transcriptId}`,
          { headers: { "X-AssemblyAI-Key": assemblyaiKey } }
        );

        if (!statusRes.ok) {
          const err = await statusRes.json();
          throw new Error(err.error || "Failed to poll transcription status");
        }

        const result = await statusRes.json();

        if (result.status === "completed") {
          utterances = result.utterances as AAIUtterance[];
          detectedLanguage = result.detectedLanguage as string | null;
          break;
        }

        if (result.status === "error") {
          throw new Error(result.error || "Transcription failed");
        }

        setState((s) => ({
          ...s,
          transcribeProgress: `Status: ${result.status}`,
        }));
      }

      const saveRes = await fetch("/api/transcript/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, utterances, detectedLanguage }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || "Failed to save transcript");
      }

      setState((s) => ({ ...s, transcribe: "done" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transcription failed";
      setState((s) => ({
        ...s,
        transcribe: "error",
        error: message,
      }));
      return;
    }

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
  }, [interviewId, audioBlobUrl, getKeys]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runPipeline();
  }, [runPipeline]);

  const steps = ["transcribe", "speakers", "summary"] as const;

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
            step === "transcribe" ? state.transcribeProgress : "";

          return (
            <div key={step} className="flex items-center gap-3">
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

      {state.error && (
        <div className="mt-4 rounded-md bg-error/10 p-3">
          <p className="text-[13px] text-error">{state.error}</p>
        </div>
      )}

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
