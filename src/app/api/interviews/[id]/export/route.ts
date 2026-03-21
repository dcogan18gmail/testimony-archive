import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { Packer } from "docx";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { generateDocx, type ExportFormat } from "@/lib/generate-docx";
import type { TranscriptSegment, SpeakerInfo } from "@/lib/types";

const VALID_FORMATS = new Set(["english", "original", "combined"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") || "english";

  if (!VALID_FORMATS.has(format)) {
    return NextResponse.json(
      { error: "Invalid format. Use: english, original, or combined" },
      { status: 400 }
    );
  }

  const [interview] = await db
    .select()
    .from(interviews)
    .where(eq(interviews.id, id))
    .limit(1);

  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const transcriptEnglish = interview.transcriptEnglish as TranscriptSegment[] | null;

  if (!transcriptEnglish || transcriptEnglish.length === 0) {
    return NextResponse.json(
      { error: "No transcript available for export" },
      { status: 400 }
    );
  }

  const transcriptOriginal = interview.transcriptOriginal as TranscriptSegment[] | null;

  // For "original" format, require that original text exists
  if (format === "original" && !transcriptOriginal) {
    return NextResponse.json(
      { error: "Original language transcript not available" },
      { status: 400 }
    );
  }

  const doc = generateDocx(
    {
      filename: interview.originalFilename,
      createdAt: interview.createdAt?.toISOString() || new Date().toISOString(),
      detectedLanguage: interview.detectedLanguage,
      durationSeconds: interview.durationSeconds,
      summary: interview.summary,
      speakerRoster: interview.speakerRoster as SpeakerInfo[] | null,
      transcriptEnglish,
      transcriptOriginal,
      eventName: interview.eventName,
      eventLocation: interview.eventLocation,
      interviewer: interview.interviewer,
      organization: interview.organization,
    },
    format as ExportFormat
  );

  const buffer = await Packer.toBuffer(doc);
  const bytes = new Uint8Array(buffer);
  const safeName = interview.originalFilename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_");

  return new Response(bytes, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}_${format}.docx"`,
    },
  });
}
