import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId } from "@/lib/auth-guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const [interview] = await db
      .select({
        status: interviews.status,
        currentStep: interviews.currentStep,
        errorMessage: interviews.errorMessage,
      })
      .from(interviews)
      .where(and(eq(interviews.id, id), eq(interviews.userId, userId)));

    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(interview);
  } catch (error) {
    console.error("Failed to fetch interview status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
