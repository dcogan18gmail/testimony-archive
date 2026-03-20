import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createOpenAIClient } from "@/lib/openai";
import { summarizeTranscript } from "@/lib/summarize";
import type { TranscriptSegment } from "@/lib/types";

export async function POST(request: NextRequest) {
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
      .select({ transcriptEnglish: interviews.transcriptEnglish })
      .from(interviews)
      .where(eq(interviews.id, interviewId));

    if (!interview?.transcriptEnglish) {
      return NextResponse.json({ error: "No transcript found for this interview" }, { status: 404 });
    }

    const segments = interview.transcriptEnglish as TranscriptSegment[];
    const client = createOpenAIClient(openaiKey);
    const summary = await summarizeTranscript(client, segments);

    await db
      .update(interviews)
      .set({
        summary,
        status: "completed",
        currentStep: "finalizing",
      })
      .where(eq(interviews.id, interviewId));

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summarize error:", error);
    const message = error instanceof Error ? error.message : "Failed to summarize transcript";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
