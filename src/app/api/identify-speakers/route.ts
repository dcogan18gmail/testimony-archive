import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { createOpenAIClient } from "@/lib/openai";
import { identifySpeakers } from "@/lib/identify-speakers";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import type { TranscriptSegment } from "@/lib/types";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (userId instanceof NextResponse) return userId;

  const openaiKey = request.headers.get("x-openai-key");
  if (!openaiKey) {
    return NextResponse.json({ error: "Missing X-OpenAI-Key header" }, { status: 401 });
  }

  let body: { interviewId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { interviewId } = body;
  if (!interviewId) {
    return NextResponse.json({ error: "interviewId is required" }, { status: 400 });
  }

  try {
    const [interview] = await db
      .select({
        transcriptEnglish: interviews.transcriptEnglish,
        transcriptOriginal: interviews.transcriptOriginal,
      })
      .from(interviews)
      .where(and(eq(interviews.id, interviewId), eq(interviews.userId, userId)));

    if (!interview?.transcriptEnglish) {
      return NextResponse.json({ error: "No transcript found for this interview" }, { status: 404 });
    }

    const segments = interview.transcriptEnglish as TranscriptSegment[];
    const client = createOpenAIClient(openaiKey);
    const { segments: namedSegments, speakers } = await identifySpeakers(client, segments);

    const originalSegments = interview.transcriptOriginal as TranscriptSegment[] | null;
    let namedOriginal = originalSegments;
    if (originalSegments && namedSegments.length === originalSegments.length) {
      namedOriginal = originalSegments.map((seg, i) => ({
        ...seg,
        speaker: namedSegments[i].speaker,
      }));
    }

    await db
      .update(interviews)
      .set({
        transcriptEnglish: namedSegments,
        transcriptOriginal: namedOriginal,
        speakerRoster: speakers,
        currentStep: "identifying_speakers",
      })
      .where(and(eq(interviews.id, interviewId), eq(interviews.userId, userId)));

    return NextResponse.json({ speakerCount: speakers.length });
  } catch (error) {
    console.error("Identify speakers error:", error);
    const message = error instanceof Error ? error.message : "Failed to identify speakers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
