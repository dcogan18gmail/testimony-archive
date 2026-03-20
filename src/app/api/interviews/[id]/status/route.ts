import { NextRequest, NextResponse } from "next/server";
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
      .select({
        status: interviews.status,
        currentStep: interviews.currentStep,
        errorMessage: interviews.errorMessage,
      })
      .from(interviews)
      .where(eq(interviews.id, id));

    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(interview);
  } catch (error) {
    console.error("Failed to fetch interview status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
