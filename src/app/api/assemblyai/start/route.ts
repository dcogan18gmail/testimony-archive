import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { submitToAssemblyAI } from "@/lib/assemblyai";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-assemblyai-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing X-AssemblyAI-Key header" }, { status: 401 });
  }

  let body: { interviewId?: string; audioBlobUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { interviewId, audioBlobUrl } = body;
  if (!interviewId || !audioBlobUrl) {
    return NextResponse.json({ error: "interviewId and audioBlobUrl are required" }, { status: 400 });
  }

  try {
    const transcriptId = await submitToAssemblyAI(audioBlobUrl, apiKey);

    await db
      .update(interviews)
      .set({ currentStep: "transcribing" })
      .where(eq(interviews.id, interviewId));

    return NextResponse.json({ transcriptId });
  } catch (error) {
    console.error("AssemblyAI start error:", error);
    const message = error instanceof Error ? error.message : "Failed to start transcription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
