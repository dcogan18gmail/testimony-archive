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
    <div className="mx-auto max-w-[1152px] px-6 py-8 pb-24">
      {/* Header */}
      <div className="mb-6">
        <a
          href="/"
          className="text-[13px] text-muted hover:text-body transition-colors"
        >
          &larr; Back to home
        </a>
        <h1 className="mt-2 font-serif text-[28px] leading-tight tracking-[0.01em] text-heading">
          {interview.originalFilename}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-muted">
          {interview.detectedLanguage && (
            <span>Language: {interview.detectedLanguage}</span>
          )}
          {interview.createdAt && (
            <span>
              {new Date(interview.createdAt).toLocaleDateString()}
            </span>
          )}
          {readOnly && (
            <span className="rounded bg-subtle px-2 py-0.5 text-[11px] text-muted">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {interview.summary && (
        <div className="mb-6 rounded-lg border border-border bg-subtle p-4">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
            Summary
          </h2>
          <p className="text-[15px] leading-relaxed text-body">
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
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-body"
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
          <div className="mt-2 space-y-6 rounded-lg border border-border bg-card p-4">
            <SpeakerPanel
              speakers={speakers}
              onRename={handleSpeakerRename}
              readOnly={readOnly}
            />
            <div className="border-t border-subtle pt-4">
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
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-[13px] text-faint">
              No transcript available.
            </div>
          )}
        </div>

        {/* Sidebar (right, ~35%) */}
        <div className="hidden w-0 flex-[35] md:block">
          <div className="sticky top-8 space-y-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <SpeakerPanel
                speakers={speakers}
                onRename={handleSpeakerRename}
                readOnly={readOnly}
              />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
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
