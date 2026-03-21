import type OpenAI from "openai";
import type { TranscriptSegment } from "./types";

/**
 * Generate a summary of the transcript using GPT.
 * Returns a plain text summary.
 */
export async function summarizeTranscript(
  client: OpenAI,
  segments: TranscriptSegment[]
): Promise<string> {
  // Build transcript text (truncate if very long)
  const transcriptText = segments
    .map((s) => `${s.speaker}: ${s.text_english}`)
    .join("\n");

  // Rough token estimate: ~4 chars per token
  const maxChars = 12000 * 4; // ~12k tokens for input
  const truncated =
    transcriptText.length > maxChars
      ? transcriptText.slice(0, maxChars) + "\n\n[Transcript truncated...]"
      : transcriptText;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that summarizes interview transcripts. " +
          "Write a 7-10 sentence summary covering the main topics discussed and key takeaways. " +
          "Be direct and specific. No bullet points or headers.",
      },
      {
        role: "user",
        content: `Please summarize this interview transcript:\n\n${truncated}`,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content?.trim() || "Summary could not be generated.";
}
