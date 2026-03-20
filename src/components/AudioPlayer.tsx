"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatTimestamp } from "@/lib/format-timestamp";

type AudioPlayerProps = {
  src: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onSeek: (time: number) => void;
};

export default function AudioPlayer({
  src,
  currentTime,
  onTimeUpdate,
  onSeek,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [dragging, setDragging] = useState(false);

  // Sync audio element currentTime when prop changes from external seek
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || dragging) return;
    // Only sync if the difference is meaningful (avoids feedback loops)
    if (Math.abs(audio.currentTime - currentTime) > 0.5) {
      audio.currentTime = currentTime;
    }
  }, [currentTime, dragging]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const audio = audioRef.current;
      if (!audio) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        const t = Math.max(0, audio.currentTime - 5);
        audio.currentTime = t;
        onSeek(t);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        const t = Math.min(duration, audio.currentTime + 5);
        audio.currentTime = t;
        onSeek(t);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, onSeek, playing]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  // Calculate seek position from a mouse/pointer event on the progress bar
  const seekFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const bar = progressRef.current;
      const audio = audioRef.current;
      if (!bar || !audio) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const t = ratio * duration;
      audio.currentTime = t;
      onSeek(t);
    },
    [duration, onSeek],
  );

  // Progress bar click
  function handleProgressClick(e: React.MouseEvent) {
    seekFromEvent(e);
  }

  // Drag handling
  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);

    function onMove(ev: MouseEvent) {
      seekFromEvent(ev);
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white px-6 py-3">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) onTimeUpdate(audioRef.current.currentTime);
        }}
        onEnded={() => setPlaying(false)}
      />

      <div className="mx-auto flex max-w-4xl items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>

        {/* Time current */}
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-500">
          {formatTimestamp(currentTime)}
        </span>

        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative flex h-5 flex-1 cursor-pointer items-center"
          onClick={handleProgressClick}
        >
          {/* Track */}
          <div className="h-1.5 w-full rounded-full bg-zinc-200">
            {/* Filled portion */}
            <div
              className="h-full rounded-full bg-zinc-900 transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Handle */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2 h-3.5 w-3.5 rounded-full bg-zinc-900 shadow-sm hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
            style={{ left: `${progress}%` }}
            onMouseDown={handleDragStart}
          />
        </div>

        {/* Time total */}
        <span className="w-12 shrink-0 text-xs tabular-nums text-zinc-500">
          {formatTimestamp(duration)}
        </span>

        {/* Volume */}
        <div className="flex shrink-0 items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-zinc-500"
          >
            <path d="M2 5.5h2l3.5-3v11l-3.5-3H2a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5z" fill="currentColor" />
            {volume > 0 && (
              <path d="M10 5.5a3 3 0 010 5" strokeLinecap="round" />
            )}
            {volume > 0.5 && (
              <path d="M11.5 3.5a5.5 5.5 0 010 9" strokeLinecap="round" />
            )}
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="h-1 w-16 cursor-pointer accent-zinc-900"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
