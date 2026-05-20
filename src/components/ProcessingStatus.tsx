"use client";

export type UploadStage = "loading" | "uploading" | "creating" | "done" | "error";

type Props = {
  stage: UploadStage;
  progress: number; // 0 to 1
  error?: string;
  filename?: string;
};

const STAGE_LABELS: Record<UploadStage, string> = {
  loading: "Loading audio processor...",
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

      {filename && (
        <p className="text-[11px] text-faint truncate">{filename}</p>
      )}

      {stage === "error" && error && (
        <p className="text-[13px] text-error">{error}</p>
      )}

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
