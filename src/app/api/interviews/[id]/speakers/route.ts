import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId } from "@/lib/auth-guard";
import type { TranscriptSegment, SpeakerInfo } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  let body: { oldName?: string; newName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { oldName, newName } = body;
  if (!oldName || !newName) {
    return NextResponse.json(
      { error: "oldName and newName are required" },
      { status: 400 }
    );
  }

  try {
    const [interview] = await db
      .select({
        transcriptEnglish: interviews.transcriptEnglish,
        transcriptOriginal: interviews.transcriptOriginal,
        speakerRoster: interviews.speakerRoster,
      })
      .from(interviews)
      .where(and(eq(interviews.id, id), eq(interviews.userId, userId)));

    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const englishSegments = (interview.transcriptEnglish as TranscriptSegment[] | null) || [];
    const updatedEnglish = englishSegments.map((seg) =>
      seg.speaker === oldName ? { ...seg, speaker: newName } : seg
    );

    const originalSegments = (interview.transcriptOriginal as TranscriptSegment[] | null) || [];
    const updatedOriginal = originalSegments.map((seg) =>
      seg.speaker === oldName ? { ...seg, speaker: newName } : seg
    );

    const roster = (interview.speakerRoster as SpeakerInfo[] | null) || [];
    const updatedRoster = roster.map((s) =>
      s.name === oldName
        ? { ...s, name: newName, id: newName.toLowerCase().replace(/\s+/g, "_") }
        : s
    );

    await db
      .update(interviews)
      .set({
        transcriptEnglish: updatedEnglish,
        transcriptOriginal: updatedOriginal,
        speakerRoster: updatedRoster,
      })
      .where(and(eq(interviews.id, id), eq(interviews.userId, userId)));

    return NextResponse.json({ speakerRoster: updatedRoster });
  } catch (error) {
    console.error("Failed to rename speaker:", error);
    return NextResponse.json({ error: "Failed to rename speaker" }, { status: 500 });
  }
}
