import { describe, it, expect } from "vitest";
import { mapUtterancesToSegments } from "@/lib/transcript-segments";
import type { AAIUtterance } from "@/lib/assemblyai";

describe("mapUtterancesToSegments", () => {
  it("maps utterance text and English translation", () => {
    const utterances: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "Привет", textEnglish: "Hello" },
    ];

    expect(mapUtterancesToSegments(utterances)).toEqual([
      {
        speaker: "A",
        start: 0,
        end: 5,
        text_english: "Hello",
        text_original: "Привет",
      },
    ]);
  });

  it("falls back to original text when English translation is missing", () => {
    const utterances: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "Hello world" },
    ];

    const result = mapUtterancesToSegments(utterances);
    expect(result[0].text_english).toBe("Hello world");
    expect(result[0].text_original).toBe("Hello world");
  });

  it("groups consecutive same-speaker utterances", () => {
    const utterances: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 3, text: "One", textEnglish: "One" },
      { speaker: "A", start: 3, end: 6, text: "Two", textEnglish: "Two" },
    ];

    const result = mapUtterancesToSegments(utterances);
    expect(result).toHaveLength(1);
    expect(result[0].text_english).toBe("One Two");
    expect(result[0].text_original).toBe("One Two");
    expect(result[0].end).toBe(6);
  });

  it("keeps different speakers as separate segments", () => {
    const utterances: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "Hi", textEnglish: "Hi" },
      { speaker: "B", start: 5, end: 10, text: "Hey", textEnglish: "Hey" },
    ];

    const result = mapUtterancesToSegments(utterances);
    expect(result).toHaveLength(2);
    expect(result[0].speaker).toBe("A");
    expect(result[1].speaker).toBe("B");
  });

  it("skips empty utterances", () => {
    const utterances: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "" },
      { speaker: "B", start: 5, end: 10, text: "OK", textEnglish: "OK" },
    ];

    expect(mapUtterancesToSegments(utterances)).toHaveLength(1);
    expect(mapUtterancesToSegments(utterances)[0].speaker).toBe("B");
  });
});
