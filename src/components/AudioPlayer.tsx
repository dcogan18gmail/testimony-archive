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
  const [localTime, setLocalTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [dragging, setDragging] = useState(false);
  const seekedExternally = useRef(false);

  // Sync audio element when parent sends a new currentTime (e.g. transcript click-to-seek)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || dragging) return;
    if (Math.abs(audio.currentTime - currentTime) > 1) {
      seekedExternally.current = true;
      audio.currentTime = currentTime;
      setLocalTime(currentTime);
    }
  }, [currentTime, dragging]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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
        setLocalTime(t);
        onSeek(t);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        const t = Math.min(duration, audio.currentTime + 5);
        audio.currentTime = t;
        setLocalTime(t);
        onSeek(t);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, onSeek]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((err) => {
        console.error("Audio play failed:", err);
      });
    } else {
      audio.pause();
    }
  }, []);

  const seekFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const bar = progressRef.current;
      const audio = audioRef.current;
      if (!bar || !audio) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const t = ratio * duration;
      audio.currentTime = t;
      setLocalTime(t);
      onSeek(t);
    },
    [duration, onSeek],
  );

  function handleProgressClick(e: React.MouseEvent) {
    seekFromEvent(e);
  }

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

  const progress = duration > 0 ? (localTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card px-6 py-3">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            const t = audioRef.current.currentTime;
            setLocalTime(t);
            onTimeUpdate(t);
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={(e) => {
          console.error("Audio error:", e.currentTarget.error);
        }}
      />

      <div className="mx-auto flex max-w-4xl items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover transition-colors"
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
        <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">
          {formatTimestamp(localTime)}
        </span>

        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative flex h-5 flex-1 cursor-pointer items-center"
          onClick={handleProgressClick}
        >
          <div className="h-1.5 w-full rounded-full bg-subtle">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2 h-3.5 w-3.5 rounded-full bg-accent shadow-sm hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
            style={{ left: `${progress}%` }}
            onMouseDown={handleDragStart}
          />
        </div>

        {/* Time total */}
        <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-muted">
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
            className="text-muted"
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
            className="h-1 w-16 cursor-pointer accent-accent"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
