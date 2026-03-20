import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq } from "drizzle-orm";
import InterviewDetail from "@/components/InterviewDetail";
import ProcessingView from "@/components/ProcessingView";

type Params = { id: string };

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const readOnly = view === "readonly";

  const [interview] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, id));

  if (!interview) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 font-sans text-center">
        <h1 className="mb-4 text-2xl font-semibold text-zinc-900">
          Interview not found
        </h1>
        <p className="mb-6 text-zinc-500">
          The interview you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <a
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          &larr; Back to home
        </a>
      </div>
    );
  }

  // If still processing, show progress view
  if (interview.status === "processing") {
    return <ProcessingView interviewId={id} currentStep={interview.currentStep} />;
  }

  // If error, show error state
  if (interview.status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 font-sans">
        <a
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          &larr; Back to home
        </a>
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="mb-2 text-lg font-semibold text-red-800">
            Processing failed
          </h1>
          <p className="text-sm text-red-700">
            {interview.errorMessage || "An unknown error occurred during processing."}
          </p>
        </div>
      </div>
    );
  }

  // Completed — show full detail view
  const data = {
    id: interview.id,
    originalFilename: interview.originalFilename,
    createdAt: interview.createdAt?.toISOString() || "",
    status: interview.status,
    detectedLanguage: interview.detectedLanguage,
    summary: interview.summary,
    transcriptEnglish: interview.transcriptEnglish as import("@/lib/types").TranscriptSegment[] | null,
    transcriptOriginal: interview.transcriptOriginal as import("@/lib/types").TranscriptSegment[] | null,
    speakerRoster: interview.speakerRoster as import("@/lib/types").SpeakerInfo[] | null,
    audioBlobUrl: interview.audioBlobUrl,
    eventName: interview.eventName,
    eventLocation: interview.eventLocation,
    interviewer: interview.interviewer,
    organization: interview.organization,
  };

  return <InterviewDetail interview={data} readOnly={readOnly} />;
}
