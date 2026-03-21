import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [interview] = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, id));

    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(interview);
  } catch (error) {
    console.error("Failed to fetch interview:", error);
    return NextResponse.json({ error: "Failed to fetch interview" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: {
    eventName?: string;
    eventLocation?: string;
    interviewer?: string;
    organization?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowedFields = ["eventName", "eventLocation", "interviewer", "organization"] as const;
  const updates: Record<string, string | null> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field] || null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(interviews)
      .set(updates)
      .where(eq(interviews.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update interview:", error);
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Delete the DB row first
    const [deleted] = await db
      .delete(interviews)
      .where(eq(interviews.id, id))
      .returning({ audioBlobUrl: interviews.audioBlobUrl });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Best-effort blob cleanup
    if (deleted.audioBlobUrl) {
      try {
        await del(deleted.audioBlobUrl);
      } catch (blobError) {
        console.error("Blob cleanup failed (non-fatal):", blobError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete interview:", error);
    return NextResponse.json({ error: "Failed to delete interview" }, { status: 500 });
  }
}
