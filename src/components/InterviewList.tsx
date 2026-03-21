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
  eventName: string | null;
  eventLocation: string | null;
  interviewer: string | null;
  organization: string | null;
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

function MetadataRow({ interview }: { interview: InterviewSummary }) {
  const fields = [
    interview.eventName,
    interview.eventLocation,
    interview.interviewer,
    interview.organization,
  ].filter(Boolean);

  if (fields.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-zinc-400">
      {fields.map((field, i) => (
        <span key={i}>
          {i > 0 && <span className="mr-1 text-zinc-300">&middot;</span>}
          {field}
        </span>
      ))}
    </div>
  );
}

export default function InterviewList() {
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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

  // Clear download error after 5 seconds
  useEffect(() => {
    if (!downloadError) return;
    const timer = setTimeout(() => setDownloadError(null), 5000);
    return () => clearTimeout(timer);
  }, [downloadError]);

  async function handleDelete(e: React.MouseEvent, id: string, filename: string) {
    e.preventDefault(); // Don't navigate to detail page
    e.stopPropagation();

    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setInterviews((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();

    setDownloadingId(id);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/interviews/${id}/export?format=english`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        `transcript_english.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloadingId(null);
    }
  }

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
      {downloadError && (
        <p className="text-xs text-red-600">{downloadError}</p>
      )}
      {interviews.map((interview) => (
        <Link
          key={interview.id}
          href={`/interviews/${interview.id}`}
          className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
        >
          {/* Top row: filename + date + action buttons */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-900 truncate">
              {interview.originalFilename}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {/* Quick download button (completed only) */}
              {interview.status === "completed" && (
                <button
                  onClick={(e) => handleDownload(e, interview.id)}
                  disabled={downloadingId === interview.id}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors disabled:opacity-50"
                  title="Download English DOCX"
                >
                  {downloadingId === interview.id ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </button>
              )}
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, interview.id, interview.originalFilename)}
                disabled={deletingId === interview.id}
                className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Delete interview"
              >
                {deletingId === interview.id ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
              <span className="text-xs text-zinc-400">
                {new Date(interview.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Technical metadata row */}
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

          {/* Interview metadata row */}
          <MetadataRow interview={interview} />

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
