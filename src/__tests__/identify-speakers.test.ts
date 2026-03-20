import { describe, it, expect, vi } from "vitest";
import { identifySpeakers } from "@/lib/identify-speakers";
import type { TranscriptSegment } from "@/lib/types";

// Mock OpenAI client
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
  { speaker: "A", start: 0, end: 5, text_english: "Hello, I'm John.", text_original: "" },
  { speaker: "B", start: 5, end: 10, text_english: "Hi John, I'm Maria.", text_original: "" },
  { speaker: "A", start: 10, end: 15, text_english: "Nice to meet you.", text_original: "" },
];

describe("identifySpeakers", () => {
  it("applies GPT name mappings to segments", async () => {
    const client = mockOpenAIClient('{"A": "John", "B": "Maria"}');
    const result = await identifySpeakers(client, sampleSegments);
    expect(result.segments[0].speaker).toBe("John");
    expect(result.segments[1].speaker).toBe("Maria");
    expect(result.segments[2].speaker).toBe("John");
  });

  it("builds speaker roster with correct counts", async () => {
    const client = mockOpenAIClient('{"A": "John", "B": "Maria"}');
    const result = await identifySpeakers(client, sampleSegments);
    expect(result.speakers).toHaveLength(2);
    const john = result.speakers.find((s) => s.name === "John");
    expect(john?.segment_count).toBe(2);
    const maria = result.speakers.find((s) => s.name === "Maria");
    expect(maria?.segment_count).toBe(1);
  });

  it("falls back to Speaker X labels when GPT returns invalid JSON", async () => {
    const client = mockOpenAIClient("this is not json");
    const result = await identifySpeakers(client, sampleSegments);
    expect(result.segments[0].speaker).toBe("Speaker A");
    expect(result.segments[1].speaker).toBe("Speaker B");
  });

  it("handles GPT response wrapped in markdown code blocks", async () => {
    const client = mockOpenAIClient('```json\n{"A": "Alice", "B": "Bob"}\n```');
    const result = await identifySpeakers(client, sampleSegments);
    expect(result.segments[0].speaker).toBe("Alice");
    expect(result.segments[1].speaker).toBe("Bob");
  });

  it("falls back when GPT API call throws", async () => {
    const client = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error("API error")),
        },
      },
    } as any;
    const result = await identifySpeakers(client, sampleSegments);
    // Should still return segments with fallback labels
    expect(result.segments).toHaveLength(3);
    expect(result.speakers.length).toBeGreaterThan(0);
  });

  it("uses Speaker X for unmapped speakers in GPT response", async () => {
    const client = mockOpenAIClient('{"A": "John"}'); // B not mapped
    const result = await identifySpeakers(client, sampleSegments);
    expect(result.segments[0].speaker).toBe("John");
    expect(result.segments[1].speaker).toBe("Speaker B");
  });
});
