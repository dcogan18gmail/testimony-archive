import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import type { AAIUtterance } from "@/lib/assemblyai";
import { mapUtterancesToSegments } from "@/lib/transcript-segments";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (userId instanceof NextResponse) return userId;

  let body: {
    interviewId?: string;
    utterances?: AAIUtterance[];
    detectedLanguage?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { interviewId, utterances, detectedLanguage } = body;

  if (!interviewId || !utterances) {
    return NextResponse.json(
      { error: "interviewId and utterances are required" },
      { status: 400 }
    );
  }

  try {
    const segments = mapUtterancesToSegments(utterances);

    const [updated] = await db
      .update(interviews)
      .set({
        transcriptEnglish: segments,
        transcriptOriginal: segments,
        detectedLanguage: detectedLanguage || null,
        currentStep: "identifying_speakers",
      })
      .where(and(eq(interviews.id, interviewId), eq(interviews.userId, userId)))
      .returning({ id: interviews.id });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ segmentCount: segments.length });
  } catch (error) {
    console.error("Transcript save error:", error);
    const message = error instanceof Error ? error.message : "Failed to save transcript";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
