"use client";

/**
 * Shows progress during the upload flow. There are three stages:
 * 1. "loading" - ffmpeg.wasm is downloading (~30MB, first time only)
 * 2. "splitting" - ffmpeg is splitting the audio into 30s chunks
 * 3. "uploading" - the full file is uploading to Vercel Blob
 *
 * This component is purely visual. The parent (UploadZone) manages
 * the actual state and passes it down as props.
 */

export type UploadStage = "loading" | "splitting" | "uploading" | "creating" | "done" | "error";

type Props = {
  stage: UploadStage;
  progress: number; // 0 to 1
  error?: string;
  filename?: string;
};

const STAGE_LABELS: Record<UploadStage, string> = {
  loading: "Loading audio processor...",
  splitting: "Splitting audio into chunks...",
  uploading: "Uploading file...",
  creating: "Creating interview...",
  done: "Upload complete!",
  error: "Something went wrong",
};

export default function ProcessingStatus({ stage, progress, error, filename }: Props) {
  const percentage = Math.round(progress * 100);

  return (
    <div className="w-full rounded-lg border border-border bg-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-heading">
          {STAGE_LABELS[stage]}
        </h3>
        {stage !== "done" && stage !== "error" && (
          <span className="text-[11px] text-faint">{percentage}%</span>
        )}
      </div>

      {/* Progress bar */}
      {stage !== "error" && (
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-subtle">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              stage === "done" ? "bg-success" : "bg-accent"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* File name */}
      {filename && (
        <p className="text-[11px] text-faint truncate">{filename}</p>
      )}

      {/* Error message */}
      {stage === "error" && error && (
        <p className="text-[13px] text-error">{error}</p>
      )}

      {/* Done message */}
      {stage === "done" && (
        <div className="flex items-center gap-2 text-success">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[13px]">Ready for transcription</span>
        </div>
      )}
    </div>
  );
}
