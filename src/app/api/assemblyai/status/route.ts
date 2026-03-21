import { NextRequest, NextResponse } from "next/server";
import { pollAssemblyAI } from "@/lib/assemblyai";
import { getAuthenticatedUserId } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (userId instanceof NextResponse) return userId;

  const apiKey = request.headers.get("x-assemblyai-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing X-AssemblyAI-Key header" }, { status: 401 });
  }

  const transcriptId = request.nextUrl.searchParams.get("transcriptId");
  if (!transcriptId) {
    return NextResponse.json({ error: "transcriptId query param required" }, { status: 400 });
  }

  try {
    const result = await pollAssemblyAI(transcriptId, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AssemblyAI status error:", error);
    const message = error instanceof Error ? error.message : "Failed to poll status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
