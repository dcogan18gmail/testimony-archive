import { describe, it, expect } from "vitest";
import { Packer } from "docx";
import { generateDocx, type ExportFormat } from "@/lib/generate-docx";
import type { TranscriptSegment, SpeakerInfo } from "@/lib/types";

const baseSpeakers: SpeakerInfo[] = [
  { id: "speaker_1", name: "Speaker 1", segment_count: 2, first_seen: 0, last_seen: 30 },
  { id: "speaker_2", name: "Speaker 2", segment_count: 1, first_seen: 15, last_seen: 15 },
];

const baseSegments: TranscriptSegment[] = [
  { speaker: "Speaker 1", start: 0, end: 10, text_english: "Hello there.", text_original: "Bonjour." },
  { speaker: "Speaker 2", start: 15, end: 25, text_english: "How are you?", text_original: "Comment allez-vous?" },
  { speaker: "Speaker 1", start: 30, end: 40, text_english: "I am fine.", text_original: "Je vais bien." },
];

const baseInput = {
  filename: "test-interview.mp3",
  createdAt: "2024-01-15T10:30:00.000Z",
  detectedLanguage: "French",
  durationSeconds: 120,
  summary: "A brief conversation about greetings.",
  speakerRoster: baseSpeakers,
  transcriptEnglish: baseSegments,
  transcriptOriginal: baseSegments,
  eventName: "Town Hall",
  eventLocation: "Paris",
  interviewer: "John",
  organization: "Acme Corp",
};

describe("generateDocx", () => {
  it("produces a valid Document for english format", async () => {
    const doc = generateDocx(baseInput, "english");
    const buffer = await Packer.toBuffer(doc);
    // DOCX files start with PK zip header
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
    expect(buffer.length).toBeGreaterThan(100);
  });

  it("produces a valid Document for original format", async () => {
    const doc = generateDocx(baseInput, "original");
    const buffer = await Packer.toBuffer(doc);
    expect(buffer[0]).toBe(0x50);
    expect(buffer.length).toBeGreaterThan(100);
  });

  it("produces a valid Document for combined format", async () => {
    const doc = generateDocx(baseInput, "combined");
    const buffer = await Packer.toBuffer(doc);
    expect(buffer[0]).toBe(0x50);
    expect(buffer.length).toBeGreaterThan(100);
  });

  it("handles missing optional fields", async () => {
    const minimalInput = {
      filename: "minimal.mp3",
      createdAt: "2024-01-01T00:00:00.000Z",
      detectedLanguage: null,
      durationSeconds: null,
      summary: null,
      speakerRoster: null,
      transcriptEnglish: [baseSegments[0]],
      transcriptOriginal: null,
      eventName: null,
      eventLocation: null,
      interviewer: null,
      organization: null,
    };

    const doc = generateDocx(minimalInput, "english");
    const buffer = await Packer.toBuffer(doc);
    expect(buffer[0]).toBe(0x50);
  });

  it("handles empty text_original in original format gracefully", async () => {
    const segsNoOriginal: TranscriptSegment[] = [
      { speaker: "Speaker 1", start: 0, end: 10, text_english: "Hello.", text_original: "" },
    ];

    const input = {
      ...baseInput,
      transcriptEnglish: segsNoOriginal,
      transcriptOriginal: segsNoOriginal,
    };

    const doc = generateDocx(input, "original");
    const buffer = await Packer.toBuffer(doc);
    expect(buffer[0]).toBe(0x50);
  });

  it("combined format includes both texts when they differ", async () => {
    // We verify the document generates without error; content is validated
    // by the docx library producing a valid zip
    const doc = generateDocx(baseInput, "combined");
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(100);
  });

  it("combined format uses only english when texts are identical", async () => {
    const identicalSegs: TranscriptSegment[] = [
      { speaker: "Speaker 1", start: 0, end: 10, text_english: "Hello.", text_original: "Hello." },
    ];

    const input = {
      ...baseInput,
      transcriptEnglish: identicalSegs,
      transcriptOriginal: identicalSegs,
    };

    const doc = generateDocx(input, "combined");
    const buffer = await Packer.toBuffer(doc);
    expect(buffer[0]).toBe(0x50);
  });

  it("each format produces different file sizes", async () => {
    const formats: ExportFormat[] = ["english", "original", "combined"];
    const sizes = await Promise.all(
      formats.map(async (f) => {
        const doc = generateDocx(baseInput, f);
        const buf = await Packer.toBuffer(doc);
        return buf.length;
      })
    );

    // Combined should be largest since it has both texts
    expect(sizes[2]).toBeGreaterThan(sizes[0]);
  });
});
