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
      <div className="mx-auto max-w-[900px] px-6 py-12 text-center">
        <h1 className="mb-4 font-serif text-[28px] tracking-[0.01em] text-heading">
          Interview not found
        </h1>
        <p className="mb-6 text-muted">
          The interview you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <a
          href="/"
          className="text-[13px] text-muted hover:text-body transition-colors"
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
      <div className="mx-auto max-w-[900px] px-6 py-12">
        <a
          href="/"
          className="text-[13px] text-muted hover:text-body transition-colors"
        >
          &larr; Back to home
        </a>
        <div className="mt-6 rounded-lg border border-error/30 bg-error/10 p-6">
          <h1 className="mb-2 font-serif text-[22px] tracking-[0.01em] text-error">
            Processing failed
          </h1>
          <p className="text-[13px] text-error">
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
