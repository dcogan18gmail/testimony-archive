import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { mergeTranscripts } from "@/lib/merge";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import type { WhisperSegment } from "@/lib/whisper";
import type { AAIUtterance } from "@/lib/assemblyai";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (userId instanceof NextResponse) return userId;

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

    const [updated] = await db
      .update(interviews)
      .set({
        transcriptEnglish: merged,
        transcriptOriginal: merged,
        detectedLanguage: detectedLanguage || null,
        currentStep: "merging",
      })
      .where(and(eq(interviews.id, interviewId), eq(interviews.userId, userId)))
      .returning({ id: interviews.id });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ segmentCount: merged.length });
  } catch (error) {
    console.error("Merge error:", error);
    const message = error instanceof Error ? error.message : "Failed to merge transcripts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
