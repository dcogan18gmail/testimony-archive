"use client";

import { useState, useCallback, useMemo } from "react";
import type { TranscriptSegment, SpeakerInfo } from "@/lib/types";
import TranscriptView from "./TranscriptView";
import AudioPlayer from "./AudioPlayer";
import SpeakerPanel from "./SpeakerPanel";
import MetadataEditor from "./MetadataEditor";
import ExportMenu from "./ExportMenu";

type InterviewData = {
  id: string;
  originalFilename: string;
  createdAt: string;
  status: string;
  detectedLanguage: string | null;
  summary: string | null;
  transcriptEnglish: TranscriptSegment[] | null;
  transcriptOriginal: TranscriptSegment[] | null;
  speakerRoster: SpeakerInfo[] | null;
  audioBlobUrl: string | null;
  eventName: string | null;
  eventLocation: string | null;
  interviewer: string | null;
  organization: string | null;
};

type InterviewDetailProps = {
  interview: InterviewData;
  readOnly: boolean;
};

export default function InterviewDetail({
  interview: initial,
  readOnly,
}: InterviewDetailProps) {
  const [interview, setInterview] = useState(initial);
  const [currentTime, setCurrentTime] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const segments = interview.transcriptEnglish || [];
  const speakers = interview.speakerRoster || [];

  // Check if original text is populated (any segment has non-empty text_original)
  const hasOriginal = useMemo(
    () => segments.some((s) => s.text_original && s.text_original.trim() !== ""),
    [segments]
  );

  // Find the active segment based on current audio time
  const activeSegmentIndex = useMemo(() => {
    if (segments.length === 0) return null;
    for (let i = segments.length - 1; i >= 0; i--) {
      if (currentTime >= segments[i].start) return i;
    }
    return null;
  }, [segments, currentTime]);

  // Click-to-seek: jump audio to segment start time
  const handleSegmentClick = useCallback(
    (index: number) => {
      const seg = segments[index];
      if (seg) setCurrentTime(seg.start);
    },
    [segments]
  );

  // Speaker rename
  const handleSpeakerRename = useCallback(
    async (oldName: string, newName: string) => {
      try {
        const res = await fetch(`/api/interviews/${interview.id}/speakers`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldName, newName }),
        });
        if (!res.ok) return;

        // Update local state
        setInterview((prev) => ({
          ...prev,
          transcriptEnglish: (prev.transcriptEnglish || []).map((seg) =>
            seg.speaker === oldName ? { ...seg, speaker: newName } : seg
          ),
          transcriptOriginal: (prev.transcriptOriginal || []).map((seg) =>
            seg.speaker === oldName ? { ...seg, speaker: newName } : seg
          ),
          speakerRoster: (prev.speakerRoster || []).map((s) =>
            s.name === oldName
              ? { ...s, name: newName, id: newName.toLowerCase().replace(/\s+/g, "_") }
              : s
          ),
        }));
      } catch {
        // Silently fail; user can retry
      }
    },
    [interview.id]
  );

  // Metadata save
  const handleMetadataSave = useCallback(
    async (metadata: {
      eventName: string;
      eventLocation: string;
      interviewer: string;
      organization: string;
    }) => {
      try {
        const res = await fetch(`/api/interviews/${interview.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        });
        if (!res.ok) return;

        setInterview((prev) => ({ ...prev, ...metadata }));
      } catch {
        // Silently fail
      }
    },
    [interview.id]
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-24 font-sans">
      {/* Header */}
      <div className="mb-6">
        <a
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          &larr; Back to home
        </a>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {interview.originalFilename}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          {interview.detectedLanguage && (
            <span>Language: {interview.detectedLanguage}</span>
          )}
          {interview.createdAt && (
            <span>
              {new Date(interview.createdAt).toLocaleDateString()}
            </span>
          )}
          {readOnly && (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {interview.summary && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Summary
          </h2>
          <p className="text-sm leading-relaxed text-zinc-800">
            {interview.summary}
          </p>
        </div>
      )}

      {/* Export buttons (prominent, above transcript) */}
      {segments.length > 0 && (
        <div className="mb-6">
          <ExportMenu
            interviewId={interview.id}
            hasOriginal={hasOriginal}
            horizontal
          />
        </div>
      )}

      {/* Mobile toggle for sidebar sections */}
      <div className="mb-4 md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700"
        >
          Speakers & Metadata
          <svg
            className={`h-4 w-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {sidebarOpen && (
          <div className="mt-2 space-y-6 rounded-lg border border-zinc-200 bg-white p-4">
            <SpeakerPanel
              speakers={speakers}
              onRename={handleSpeakerRename}
              readOnly={readOnly}
            />
            <div className="border-t border-zinc-100 pt-4">
              <MetadataEditor
                eventName={interview.eventName}
                eventLocation={interview.eventLocation}
                interviewer={interview.interviewer}
                organization={interview.organization}
                onSave={handleMetadataSave}
                readOnly={readOnly}
              />
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Transcript (left, ~65%) */}
        <div className="min-w-0 flex-[65]">
          {segments.length > 0 ? (
            <TranscriptView
              segments={segments}
              activeSegmentIndex={activeSegmentIndex}
              onSegmentClick={handleSegmentClick}
              hasOriginal={hasOriginal}
              readOnly={readOnly}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
              No transcript available.
            </div>
          )}
        </div>

        {/* Sidebar (right, ~35%) — hidden on mobile */}
        <div className="hidden w-0 flex-[35] md:block">
          <div className="sticky top-8 space-y-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <SpeakerPanel
                speakers={speakers}
                onRename={handleSpeakerRename}
                readOnly={readOnly}
              />
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <MetadataEditor
                eventName={interview.eventName}
                eventLocation={interview.eventLocation}
                interviewer={interview.interviewer}
                organization={interview.organization}
                onSave={handleMetadataSave}
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audio player (bottom-pinned) */}
      {interview.audioBlobUrl && (
        <AudioPlayer
          src={interview.audioBlobUrl}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
          onSeek={setCurrentTime}
        />
      )}
    </div>
  );
}
