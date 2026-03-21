"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/lib/types";
import { formatTimestamp } from "@/lib/format-timestamp";

type LanguageMode = "english" | "original" | "combined";

type TranscriptViewProps = {
  segments: TranscriptSegment[];
  activeSegmentIndex: number | null;
  onSegmentClick: (index: number) => void;
  hasOriginal: boolean;
  readOnly?: boolean;
};

export default function TranscriptView({
  segments,
  activeSegmentIndex,
  onSegmentClick,
  hasOriginal,
}: TranscriptViewProps) {
  const [language, setLanguage] = useState<LanguageMode>("english");
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevActiveIndex = useRef<number | null>(null);

  // Auto-scroll to active segment, but only when the index actually changes
  useEffect(() => {
    if (
      activeSegmentIndex !== null &&
      activeSegmentIndex !== prevActiveIndex.current
    ) {
      segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
    prevActiveIndex.current = activeSegmentIndex;
  }, [activeSegmentIndex]);

  const setSegmentRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      segmentRefs.current[index] = el;
    },
    [],
  );

  const toggleButtons: { label: string; value: LanguageMode }[] = [
    { label: "English", value: "english" },
    { label: "Original", value: "original" },
    { label: "Combined", value: "combined" },
  ];

  return (
    <div role="region" aria-label="Transcript">
      {/* Language toggle */}
      <div
        className="mb-4 flex gap-1 rounded-lg bg-subtle p-1"
        role="radiogroup"
        aria-label="Language display mode"
      >
        {toggleButtons.map((btn) => {
          const isActive = language === btn.value;
          const isDisabled =
            !hasOriginal &&
            (btn.value === "original" || btn.value === "combined");

          return (
            <button
              key={btn.value}
              role="radio"
              aria-checked={isActive}
              disabled={isDisabled}
              title={
                isDisabled
                  ? "No original language text available"
                  : undefined
              }
              onClick={() => setLanguage(btn.value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                isDisabled
                  ? "cursor-not-allowed text-muted opacity-50"
                  : isActive
                    ? "bg-accent text-white"
                    : "text-muted hover:text-heading"
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Segment list */}
      <div className="overflow-y-auto">
        {segments.map((segment, index) => {
          const isActive = index === activeSegmentIndex;

          return (
            <button
              key={index}
              ref={setSegmentRef(index)}
              onClick={() => onSegmentClick(index)}
              aria-current={isActive ? "true" : undefined}
              className={`block w-full min-h-[44px] border-b border-subtle px-3 py-3 text-left transition-transform active:scale-[0.99] ${
                isActive
                  ? "border-l-2 border-l-accent bg-subtle"
                  : "border-l-2 border-l-transparent"
              }`}
            >
              {/* Speaker + timestamp */}
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-heading">
                  {segment.speaker}
                </span>
                <span className="font-mono text-[13px] text-muted">
                  {formatTimestamp(segment.start)}
                </span>
              </div>

              {/* Transcript text */}
              <div className="mt-1">
                {language === "english" && (
                  <p className="text-body">{segment.text_english}</p>
                )}

                {language === "original" && (
                  <p className="text-body">{segment.text_original}</p>
                )}

                {language === "combined" && (
                  <>
                    <p className="text-body">{segment.text_original}</p>
                    <p className="mt-1 italic text-muted">
                      {segment.text_english}
                    </p>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
