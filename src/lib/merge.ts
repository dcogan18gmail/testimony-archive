import type { WhisperSegment } from "./whisper";
import type { AAIUtterance } from "./assemblyai";
import type { TranscriptSegment } from "./types";

/**
 * Find the speaker with the most overlap for a given time range.
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
 * Build original-language text by assigning each AAI utterance to the best-matching
 * Whisper segment (1:1), so no utterance text gets duplicated across segments.
 */
function buildOriginalTextMap(
  whisperSegments: WhisperSegment[],
  aaiUtterances: AAIUtterance[]
): Map<number, string> {
  const textMap = new Map<number, string>();

  for (const utt of aaiUtterances) {
    if (!utt.text) continue;

    // Find the Whisper segment with the most overlap for this utterance
    let bestIndex = -1;
    let bestOverlap = 0;

    for (let i = 0; i < whisperSegments.length; i++) {
      const seg = whisperSegments[i];
      const overlapStart = Math.max(utt.start, seg.start);
      const overlapEnd = Math.min(utt.end, seg.end);
      const overlap = Math.max(0, overlapEnd - overlapStart);

      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0) {
      const existing = textMap.get(bestIndex);
      textMap.set(bestIndex, existing ? existing + " " + utt.text : utt.text);
    }
  }

  return textMap;
}

/**
 * Merge Whisper segments (English translations) with AssemblyAI utterances (speaker labels + original text).
 *
 * Each AAI utterance is assigned to exactly one Whisper segment (the best overlap),
 * preventing original-language text from being duplicated across segments.
 * Then consecutive same-speaker segments are grouped together.
 */
export function mergeTranscripts(
  whisperSegments: WhisperSegment[],
  aaiUtterances: AAIUtterance[]
): TranscriptSegment[] {
  const originalTextMap = buildOriginalTextMap(whisperSegments, aaiUtterances);

  // Assign speakers and original text to each Whisper segment
  const labeled = whisperSegments.map((seg, i) => ({
    speaker: findSpeaker(seg.start, seg.end, aaiUtterances),
    start: seg.start,
    end: seg.end,
    text_english: seg.text,
    text_original: originalTextMap.get(i) || "",
  }));

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
