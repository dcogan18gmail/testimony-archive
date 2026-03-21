"use client";

import { useState, useEffect } from "react";

type ExportFormat = "english" | "original" | "combined";

type ExportMenuProps = {
  interviewId: string;
  hasOriginal: boolean;
  horizontal?: boolean;
};

export default function ExportMenu({
  interviewId,
  hasOriginal,
  horizontal = false,
}: ExportMenuProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleExport(format: ExportFormat) {
    setLoading(format);
    setError(null);

    try {
      const res = await fetch(
        `/api/interviews/${interviewId}/export?format=${format}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      // Download the file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        `transcript_${format}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(null);
    }
  }

  const formats: { key: ExportFormat; label: string; disabled: boolean }[] = [
    { key: "english", label: "English", disabled: false },
    {
      key: "original",
      label: "Original Language",
      disabled: !hasOriginal,
    },
    {
      key: "combined",
      label: "Combined",
      disabled: !hasOriginal,
    },
  ];

  return (
    <div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Export Transcript
      </h3>
      <div className={horizontal ? "flex flex-wrap gap-2" : "space-y-2"}>
        {formats.map(({ key, label, disabled }) => (
          <button
            key={key}
            onClick={() => handleExport(key)}
            disabled={disabled || loading !== null}
            className={`flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 transition-colors ${
              horizontal ? "" : "w-full"
            } ${
              disabled || loading !== null
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-zinc-50"
            }`}
          >
            {loading === key ? (
              <svg
                className="mr-2 h-4 w-4 animate-spin text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="mr-2 h-4 w-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
