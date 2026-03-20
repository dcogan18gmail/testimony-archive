import type { WhisperSegment } from "./whisper";
import type { AAIUtterance } from "./assemblyai";
import type { TranscriptSegment } from "./types";

/**
 * Find the speaker who has the most overlap with a given time range.
 * Returns the speaker label (e.g., "A", "B") or "?" if no overlap found.
 */
function findSpeaker(
  start: number,
  end: number,
  speakerSegments: AAIUtterance[]
): string {
  let bestSpeaker = "?";
  let bestOverlap = 0;

  for (const seg of speakerSegments) {
    const overlapStart = Math.max(start, seg.start);
    const overlapEnd = Math.min(end, seg.end);
    const overlap = Math.max(0, overlapEnd - overlapStart);

    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestSpeaker = seg.speaker;
    }
  }

  return bestSpeaker;
}

/**
 * Merge Whisper segments (English translations) with AssemblyAI utterances (speaker labels).
 *
 * For each Whisper segment, finds the best matching speaker from AssemblyAI based on
 * timestamp overlap. Then groups consecutive same-speaker segments together.
 *
 * Returns TranscriptSegment[] with speaker labels and English text.
 * text_original is set to empty string (AssemblyAI gives us the original language text
 * but we don't have per-segment original text from Whisper).
 */
export function mergeTranscripts(
  whisperSegments: WhisperSegment[],
  aaiUtterances: AAIUtterance[]
): TranscriptSegment[] {
  // Assign speakers to each Whisper segment
  const labeled = whisperSegments.map((seg) => ({
    speaker: findSpeaker(seg.start, seg.end, aaiUtterances),
    start: seg.start,
    end: seg.end,
    text_english: seg.text,
    text_original: "",
  }));

  // Group consecutive segments by same speaker
  const grouped: TranscriptSegment[] = [];
  for (const seg of labeled) {
    const last = grouped[grouped.length - 1];
    if (last && last.speaker === seg.speaker) {
      last.end = seg.end;
      last.text_english += " " + seg.text_english;
    } else {
      grouped.push({ ...seg });
    }
  }

  return grouped;
}
