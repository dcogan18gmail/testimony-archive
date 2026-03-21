import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";

export async function GET() {
  const rows = await db
    .select({
      id: interviews.id,
      originalFilename: interviews.originalFilename,
      createdAt: interviews.createdAt,
      status: interviews.status,
      detectedLanguage: interviews.detectedLanguage,
      durationSeconds: interviews.durationSeconds,
      summary: interviews.summary,
      speakerRoster: interviews.speakerRoster,
      currentStep: interviews.currentStep,
      errorMessage: interviews.errorMessage,
      eventName: interviews.eventName,
      eventLocation: interviews.eventLocation,
      interviewer: interviews.interviewer,
      organization: interviews.organization,
    })
    .from(interviews)
    .orderBy(desc(interviews.createdAt));

  return NextResponse.json(rows);
}

/**
 * Create a new interview row after the audio file has been uploaded to Blob.
 *
 * The client sends { filename, blobUrl, durationSeconds } after:
 * 1. ffmpeg.wasm has split the audio into chunks (held in browser memory)
 * 2. The full file has been uploaded to Vercel Blob
 *
 * We create a database row with status "processing" and return the new
 * interview ID. Phase 3 will use this ID to attach transcription results.
 */
export async function POST(request: Request) {
  let body: { filename?: string; blobUrl?: string; durationSeconds?: number };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { filename, blobUrl, durationSeconds } = body;

  if (!filename || typeof filename !== "string") {
    return NextResponse.json(
      { error: "filename is required" },
      { status: 400 }
    );
  }

  if (!blobUrl || typeof blobUrl !== "string") {
    return NextResponse.json(
      { error: "blobUrl is required" },
      { status: 400 }
    );
  }

  try {
    const [row] = await db
      .insert(interviews)
      .values({
        originalFilename: filename,
        audioBlobUrl: blobUrl,
        durationSeconds: durationSeconds ?? null,
        status: "processing",
        currentStep: "uploading",
      })
      .returning({ id: interviews.id });

    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create interview:", error);
    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
}
