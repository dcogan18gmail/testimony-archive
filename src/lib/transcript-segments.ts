import type { AAIUtterance } from "./assemblyai";
import type { TranscriptSegment } from "./types";

/**
 * Map AssemblyAI utterances (original + per-utterance English) to app segments.
 * Groups consecutive same-speaker utterances into one segment.
 */
export function mapUtterancesToSegments(utterances: AAIUtterance[]): TranscriptSegment[] {
  const labeled = utterances
    .filter((u) => u.text)
    .map((u) => ({
      speaker: u.speaker,
      start: u.start,
      end: u.end,
      text_english: (u.textEnglish ?? u.text).trim(),
      text_original: u.text.trim(),
    }));

  const grouped: TranscriptSegment[] = [];
  for (const seg of labeled) {
    const last = grouped[grouped.length - 1];
    if (last && last.speaker === seg.speaker) {
      last.end = seg.end;
      last.text_english = `${last.text_english} ${seg.text_english}`.trim();
      last.text_original = `${last.text_original} ${seg.text_original}`.trim();
    } else {
      grouped.push({ ...seg });
    }
  }

  return grouped;
}
