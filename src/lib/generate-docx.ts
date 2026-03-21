import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { formatTimestamp } from "./format-timestamp";
import type { TranscriptSegment, SpeakerInfo } from "./types";

export type ExportFormat = "english" | "original" | "combined";

type DocxInput = {
  filename: string;
  createdAt: string;
  detectedLanguage: string | null;
  durationSeconds: number | null;
  summary: string | null;
  speakerRoster: SpeakerInfo[] | null;
  transcriptEnglish: TranscriptSegment[];
  transcriptOriginal: TranscriptSegment[] | null;
  eventName: string | null;
  eventLocation: string | null;
  interviewer: string | null;
  organization: string | null;
};

function metadataLine(label: string, value: string | null): Paragraph | null {
  if (!value) return null;
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20, font: "Arial" }),
      new TextRun({ text: value, size: 20, font: "Arial" }),
    ],
  });
}

function getText(
  seg: TranscriptSegment,
  original: TranscriptSegment | undefined,
  format: ExportFormat
): string {
  switch (format) {
    case "english":
      return seg.text_english;
    case "original":
      return original?.text_original || seg.text_original || "";
    case "combined": {
      const origText = original?.text_original || seg.text_original || "";
      if (origText && origText !== seg.text_english) {
        return `${seg.text_english}\n[Original] ${origText}`;
      }
      return seg.text_english;
    }
  }
}

export function generateDocx(input: DocxInput, format: ExportFormat): Document {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: input.filename, bold: true, size: 32, font: "Arial" }),
      ],
    })
  );

  // Date
  sections.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: new Date(input.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          size: 20,
          color: "666666",
          font: "Arial",
        }),
      ],
    })
  );

  // Metadata block
  const metaLines = [
    metadataLine("Language", input.detectedLanguage),
    metadataLine(
      "Duration",
      input.durationSeconds ? formatTimestamp(input.durationSeconds) : null
    ),
    metadataLine(
      "Speakers",
      input.speakerRoster?.length
        ? input.speakerRoster.map((s) => s.name).join(", ")
        : null
    ),
    metadataLine("Event", input.eventName),
    metadataLine("Location", input.eventLocation),
    metadataLine("Interviewer", input.interviewer),
    metadataLine("Organization", input.organization),
  ].filter((p): p is Paragraph => p !== null);

  if (metaLines.length > 0) {
    sections.push(...metaLines);
    // Separator
    sections.push(
      new Paragraph({
        spacing: { before: 200, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        },
      })
    );
  }

  // Summary
  if (input.summary) {
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Summary", bold: true, size: 24, font: "Arial" }),
        ],
      })
    );
    sections.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: input.summary,
            size: 20,
            font: "Arial",
          }),
        ],
      })
    );
    sections.push(
      new Paragraph({
        spacing: { before: 100, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        },
      })
    );
  }

  // Transcript header
  const formatLabel =
    format === "english"
      ? "Transcript (English)"
      : format === "original"
        ? "Transcript (Original Language)"
        : "Transcript (Combined)";

  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: formatLabel, bold: true, size: 24, font: "Arial" }),
      ],
    })
  );

  // Transcript segments
  const englishSegs = input.transcriptEnglish;
  const originalSegs = input.transcriptOriginal;

  for (let i = 0; i < englishSegs.length; i++) {
    const seg = englishSegs[i];
    const origSeg = originalSegs?.[i];
    const text = getText(seg, origSeg, format);
    const timestamp = formatTimestamp(seg.start);

    sections.push(
      new Paragraph({
        spacing: { before: 100, after: 40 },
        children: [
          new TextRun({
            text: `[${timestamp}] ${seg.speaker}`,
            bold: true,
            size: 20,
            font: "Arial",
          }),
        ],
      })
    );

    // Split combined text into lines for original annotation
    const lines = text.split("\n");
    for (const line of lines) {
      const isOriginalLine = line.startsWith("[Original]");
      sections.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: line,
              size: 20,
              font: "Arial",
              italics: isOriginalLine,
              color: isOriginalLine ? "666666" : "000000",
            }),
          ],
        })
      );
    }
  }

  // Footer
  sections.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Generated by Transcription App",
          size: 16,
          color: "999999",
          font: "Arial",
        }),
      ],
    })
  );

  return new Document({
    sections: [{ children: sections }],
  });
}
