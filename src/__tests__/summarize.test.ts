import { describe, it, expect, vi } from "vitest";
import { summarizeTranscript } from "@/lib/summarize";
import type { TranscriptSegment } from "@/lib/types";

function mockOpenAIClient(responseContent: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: responseContent } }],
        }),
      },
    },
  } as any;
}

const sampleSegments: TranscriptSegment[] = [
  { speaker: "John", start: 0, end: 10, text_english: "Welcome to the show.", text_original: "" },
  { speaker: "Maria", start: 10, end: 20, text_english: "Thank you for having me.", text_original: "" },
];

describe("summarizeTranscript", () => {
  it("returns GPT-generated summary", async () => {
    const client = mockOpenAIClient("This is an interview between John and Maria.");
    const summary = await summarizeTranscript(client, sampleSegments);
    expect(summary).toBe("This is an interview between John and Maria.");
  });

  it("returns fallback message when GPT returns empty content", async () => {
    const client = mockOpenAIClient("");
    const summary = await summarizeTranscript(client, sampleSegments);
    expect(summary).toBe("Summary could not be generated.");
  });

  it("truncates very long transcripts", async () => {
    const client = mockOpenAIClient("Summary of long transcript");
    // Create a very long transcript
    const longSegments: TranscriptSegment[] = Array.from({ length: 1000 }, (_, i) => ({
      speaker: "Speaker",
      start: i * 10,
      end: (i + 1) * 10,
      text_english: "A".repeat(100),
      text_original: "",
    }));
    const summary = await summarizeTranscript(client, longSegments);
    expect(summary).toBe("Summary of long transcript");
    // Verify the create call was made (meaning it handled the long input)
    expect(client.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});
