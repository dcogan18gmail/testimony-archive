"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type InterviewSummary = {
  id: string;
  originalFilename: string;
  createdAt: string;
  status: string;
  detectedLanguage: string | null;
  durationSeconds: number | null;
  summary: string | null;
  speakerRoster: { name: string }[] | null;
  currentStep: string | null;
  errorMessage: string | null;
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    processing: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] || "bg-zinc-100 text-zinc-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function InterviewList() {
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchInterviews = useCallback(async () => {
    try {
      const res = await fetch("/api/interviews");
      if (!res.ok) return;
      const data = await res.json();
      setInterviews(data);
      setLoaded(true);
    } catch {
      // Silently fail; list will stay empty or stale
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  // Auto-refresh every 5s when there are processing interviews
  const hasProcessing = interviews.some((i) => i.status === "processing");

  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(fetchInterviews, 5000);
    return () => clearInterval(interval);
  }, [hasProcessing, fetchInterviews]);

  if (!loaded) return null;

  if (interviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
        <p className="text-sm text-zinc-500">No interviews yet</p>
        <p className="mt-1 text-xs text-zinc-400">
          Upload an audio file above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Interviews
      </h2>
      {interviews.map((interview) => (
        <Link
          key={interview.id}
          href={`/interviews/${interview.id}`}
          className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
        >
          {/* Top row: filename + date */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-900 truncate">
              {interview.originalFilename}
            </span>
            <span className="shrink-0 text-xs text-zinc-400">
              {new Date(interview.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Metadata row */}
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
            {interview.detectedLanguage && (
              <>
                <span>{interview.detectedLanguage}</span>
                <span className="text-zinc-300">&middot;</span>
              </>
            )}
            {interview.durationSeconds && (
              <>
                <span>{formatDuration(interview.durationSeconds)}</span>
                <span className="text-zinc-300">&middot;</span>
              </>
            )}
            {interview.speakerRoster && interview.speakerRoster.length > 0 && (
              <span>
                {interview.speakerRoster.length} speaker
                {interview.speakerRoster.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Status badge */}
          <div className="mt-2">
            <StatusBadge status={interview.status} />
            {interview.status === "processing" && interview.currentStep && (
              <span className="ml-2 text-xs text-zinc-400">
                {interview.currentStep.replace(/_/g, " ")}
              </span>
            )}
            {interview.status === "error" && interview.errorMessage && (
              <span className="ml-2 text-xs text-red-500 truncate">
                {interview.errorMessage}
              </span>
            )}
          </div>

          {/* Summary preview */}
          {interview.summary && (
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 line-clamp-2">
              {interview.summary}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
