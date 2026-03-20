"use client";

import { useState, useRef, useEffect } from "react";
import type { SpeakerInfo } from "@/lib/types";
import { formatTimestamp } from "@/lib/format-timestamp";

type SpeakerPanelProps = {
  speakers: SpeakerInfo[];
  onRename: (oldName: string, newName: string) => void;
  readOnly?: boolean;
};

export default function SpeakerPanel({
  speakers,
  onRename,
  readOnly,
}: SpeakerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  function startEditing(speaker: SpeakerInfo) {
    if (readOnly) return;
    setEditingId(speaker.id);
    setEditValue(speaker.name);
  }

  function save(oldName: string) {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== oldName) {
      onRename(oldName, trimmed);
    }
    setEditingId(null);
  }

  function cancel() {
    setEditingId(null);
  }

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
        Speakers
      </h3>

      {speakers.length === 0 && (
        <p className="text-sm text-zinc-400">No speakers identified.</p>
      )}

      <ul className="space-y-2">
        {speakers.map((speaker) => (
          <li key={speaker.id} className="group">
            <div className="flex items-start justify-between gap-2">
              {/* Name: editable or static */}
              <div className="min-w-0 flex-1">
                {editingId === speaker.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") save(speaker.name);
                      if (e.key === "Escape") cancel();
                    }}
                    onBlur={() => save(speaker.name)}
                    className="w-full border border-zinc-300 rounded px-2 py-0.5 text-sm
                               text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(speaker)}
                    disabled={readOnly}
                    className={`text-sm font-medium text-zinc-900 truncate ${
                      readOnly
                        ? "cursor-default"
                        : "hover:text-zinc-600 cursor-pointer"
                    }`}
                  >
                    {speaker.name}
                  </button>
                )}

                {/* Time range */}
                <p className="text-xs text-zinc-400 mt-0.5">
                  {formatTimestamp(speaker.first_seen)} &ndash;{" "}
                  {formatTimestamp(speaker.last_seen)}
                </p>
              </div>

              {/* Segment count */}
              <span className="text-xs text-zinc-500 whitespace-nowrap pt-0.5">
                {speaker.segment_count}{" "}
                {speaker.segment_count === 1 ? "segment" : "segments"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
