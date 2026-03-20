import { describe, it, expect } from "vitest";
import { mergeTranscripts } from "@/lib/merge";
import type { WhisperSegment } from "@/lib/whisper";
import type { AAIUtterance } from "@/lib/assemblyai";

describe("mergeTranscripts", () => {
  it("merges single whisper segment with single AAI utterance", () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 5, text: "Hello world" },
    ];
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "Hello world" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result).toEqual([
      {
        speaker: "A",
        start: 0,
        end: 5,
        text_english: "Hello world",
        text_original: "Hello world",
      },
    ]);
  });

  it("assigns correct speaker when multiple AAI utterances exist (best overlap)", () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 10, text: "Some text" },
    ];
    // Speaker B covers 0-3 (3s overlap), Speaker C covers 3-10 (7s overlap)
    const aai: AAIUtterance[] = [
      { speaker: "B", start: 0, end: 3, text: "" },
      { speaker: "C", start: 3, end: 10, text: "" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result).toHaveLength(1);
    expect(result[0].speaker).toBe("C");
  });

  it("groups consecutive same-speaker segments together", () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 3, text: "First" },
      { start: 3, end: 6, text: "Second" },
      { start: 6, end: 9, text: "Third" },
    ];
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 9, text: "" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result).toHaveLength(1);
    expect(result[0].speaker).toBe("A");
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(9);
  });

  it("keeps different speakers separate (no grouping across speakers)", () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 5, text: "Hello" },
      { start: 5, end: 10, text: "Hi there" },
    ];
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "" },
      { speaker: "B", start: 5, end: 10, text: "" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result).toHaveLength(2);
    expect(result[0].speaker).toBe("A");
    expect(result[1].speaker).toBe("B");
  });

  it('returns "?" speaker when no AAI utterances overlap', () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 5, text: "No overlap" },
    ];
    // AAI utterance is entirely outside the whisper segment range
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 20, end: 25, text: "" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result).toHaveLength(1);
    expect(result[0].speaker).toBe("?");
  });

  it("handles empty whisper segments array", () => {
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "" },
    ];

    const result = mergeTranscripts([], aai);

    expect(result).toEqual([]);
  });

  it('handles empty AAI utterances array (all speakers become "?")', () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 3, text: "One" },
      { start: 3, end: 6, text: "Two" },
    ];

    const result = mergeTranscripts(whisper, []);

    expect(result).toHaveLength(1); // same speaker "?" groups them
    expect(result[0].speaker).toBe("?");
  });

  it("handles partial overlap correctly (picks utterance with more overlap)", () => {
    // Whisper segment from 4-10
    // Speaker A covers 2-6 (overlap: 4-6 = 2s)
    // Speaker B covers 6-12 (overlap: 6-10 = 4s)
    const whisper: WhisperSegment[] = [
      { start: 4, end: 10, text: "Partial" },
    ];
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 2, end: 6, text: "" },
      { speaker: "B", start: 6, end: 12, text: "" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result).toHaveLength(1);
    expect(result[0].speaker).toBe("B");
  });

  it("grouped segments concatenate text with space", () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 2, text: "Hello" },
      { start: 2, end: 4, text: "world" },
      { start: 4, end: 6, text: "today" },
    ];
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 6, text: "" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result).toHaveLength(1);
    expect(result[0].text_english).toBe("Hello world today");
  });

  it("populates text_original from AAI utterances with matching text", () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 5, text: "Hello" },
      { start: 5, end: 10, text: "World" },
    ];
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "Hola" },
      { speaker: "B", start: 5, end: 10, text: "Mundo" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result).toHaveLength(2);
    expect(result[0].text_original).toBe("Hola");
    expect(result[1].text_original).toBe("Mundo");
  });

  it("text_original is empty when AAI utterances have no text", () => {
    const whisper: WhisperSegment[] = [
      { start: 0, end: 3, text: "First" },
    ];
    const aai: AAIUtterance[] = [
      { speaker: "A", start: 0, end: 5, text: "" },
    ];

    const result = mergeTranscripts(whisper, aai);

    expect(result[0].text_original).toBe("");
  });
});
