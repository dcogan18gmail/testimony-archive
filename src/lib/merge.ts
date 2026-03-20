import type { WhisperSegment } from "./whisper";
import type { AAIUtterance } from "./assemblyai";
import type { TranscriptSegment } from "./types";

/**
 * Find the speaker and original-language text that best overlap a given time range.
 * Returns the speaker label (e.g., "A", "B") and collected original text.
 */
function findSpeakerAndOriginal(
  start: number,
  end: number,
  speakerSegments: AAIUtterance[]
): { speaker: string; textOriginal: string } {
  let bestSpeaker = "?";
  let bestOverlap = 0;
  const overlappingTexts: string[] = [];

  for (const seg of speakerSegments) {
    const overlapStart = Math.max(start, seg.start);
    const overlapEnd = Math.min(end, seg.end);
    const overlap = Math.max(0, overlapEnd - overlapStart);

    if (overlap > 0 && seg.text) {
      overlappingTexts.push(seg.text);
    }

    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestSpeaker = seg.speaker;
    }
  }

  return { speaker: bestSpeaker, textOriginal: overlappingTexts.join(" ") };
}

/**
 * Merge Whisper segments (English translations) with AssemblyAI utterances (speaker labels + original text).
 *
 * For each Whisper segment, finds the best matching speaker and original-language text
 * from AssemblyAI based on timestamp overlap. Then groups consecutive same-speaker segments.
 *
 * Returns TranscriptSegment[] with speaker labels, English text, and original-language text.
 */
export function mergeTranscripts(
  whisperSegments: WhisperSegment[],
  aaiUtterances: AAIUtterance[]
): TranscriptSegment[] {
  // Assign speakers and original text to each Whisper segment
  const labeled = whisperSegments.map((seg) => {
    const { speaker, textOriginal } = findSpeakerAndOriginal(seg.start, seg.end, aaiUtterances);
    return {
      speaker,
      start: seg.start,
      end: seg.end,
      text_english: seg.text,
      text_original: textOriginal,
    };
  });

  // Group consecutive segments by same speaker
  const grouped: TranscriptSegment[] = [];
  for (const seg of labeled) {
    const last = grouped[grouped.length - 1];
    if (last && last.speaker === seg.speaker) {
      last.end = seg.end;
      last.text_english += " " + seg.text_english;
      if (seg.text_original) {
        last.text_original += last.text_original ? " " + seg.text_original : seg.text_original;
      }
    } else {
      grouped.push({ ...seg });
    }
  }

  return grouped;
}
