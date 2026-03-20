import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { mergeTranscripts } from "@/lib/merge";
import type { WhisperSegment } from "@/lib/whisper";
import type { AAIUtterance } from "@/lib/assemblyai";

export async function POST(request: NextRequest) {
  let body: {
    interviewId?: string;
    whisperSegments?: WhisperSegment[];
    aaiUtterances?: AAIUtterance[];
    detectedLanguage?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { interviewId, whisperSegments, aaiUtterances, detectedLanguage } = body;

  if (!interviewId || !whisperSegments || !aaiUtterances) {
    return NextResponse.json(
      { error: "interviewId, whisperSegments, and aaiUtterances are required" },
      { status: 400 }
    );
  }

  try {
    const merged = mergeTranscripts(whisperSegments, aaiUtterances);

    await db
      .update(interviews)
      .set({
        transcriptEnglish: merged,
        detectedLanguage: detectedLanguage || null,
        currentStep: "merging",
      })
      .where(eq(interviews.id, interviewId));

    return NextResponse.json({ segmentCount: merged.length });
  } catch (error) {
    console.error("Merge error:", error);
    const message = error instanceof Error ? error.message : "Failed to merge transcripts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
