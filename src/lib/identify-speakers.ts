import type OpenAI from "openai";
import type { TranscriptSegment, SpeakerInfo } from "./types";

/**
 * Use GPT to identify speaker names from the transcript content.
 * Looks for self-introductions, greetings by name, etc.
 * Falls back to Speaker A/B/C labels if GPT can't find names.
 */
export async function identifySpeakers(
  client: OpenAI,
  segments: TranscriptSegment[]
): Promise<{ segments: TranscriptSegment[]; speakers: SpeakerInfo[] }> {
  // Get unique speaker labels
  const uniqueSpeakers = [...new Set(segments.map((s) => s.speaker))];

  // Build a condensed transcript for GPT (first ~100 segments to stay within token limits)
  const sample = segments.slice(0, 100);
  const transcriptText = sample
    .map((s) => `[Speaker ${s.speaker}] ${s.text_english}`)
    .join("\n");

  const prompt = `Below is a transcript with generic speaker labels (A, B, C, etc.).
Analyze the conversation and try to identify the real names of each speaker based on:
- Self-introductions ("My name is...", "I'm...")
- Others addressing them by name
- Context clues

Return a JSON object mapping speaker labels to names. If you cannot identify a speaker's name, use "Speaker X" where X is their label.

Example response:
{"A": "John Smith", "B": "Speaker B", "C": "Maria Garcia"}

Transcript:
${transcriptText}

Return ONLY the JSON object, no other text.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5.4-nano",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content?.trim() || "{}";

    // Parse the JSON, handling potential markdown code blocks
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const nameMap: Record<string, string> = JSON.parse(cleaned);

    // Apply names to segments
    const namedSegments = segments.map((seg) => ({
      ...seg,
      speaker: nameMap[seg.speaker] || `Speaker ${seg.speaker}`,
    }));

    // Build speaker roster
    const speakerMap = new Map<string, SpeakerInfo>();
    for (const seg of namedSegments) {
      const existing = speakerMap.get(seg.speaker);
      if (existing) {
        existing.segment_count++;
        existing.last_seen = Math.max(existing.last_seen, seg.end);
      } else {
        speakerMap.set(seg.speaker, {
          id: seg.speaker.toLowerCase().replace(/\s+/g, "_"),
          name: seg.speaker,
          segment_count: 1,
          first_seen: seg.start,
          last_seen: seg.end,
        });
      }
    }

    return {
      segments: namedSegments,
      speakers: [...speakerMap.values()],
    };
  } catch {
    // Fallback: use generic Speaker X labels
    const namedSegments = segments.map((seg) => ({
      ...seg,
      speaker: uniqueSpeakers.length <= 1 ? "Speaker" : `Speaker ${seg.speaker}`,
    }));

    const speakerMap = new Map<string, SpeakerInfo>();
    for (const seg of namedSegments) {
      const existing = speakerMap.get(seg.speaker);
      if (existing) {
        existing.segment_count++;
        existing.last_seen = Math.max(existing.last_seen, seg.end);
      } else {
        speakerMap.set(seg.speaker, {
          id: seg.speaker.toLowerCase().replace(/\s+/g, "_"),
          name: seg.speaker,
          segment_count: 1,
          first_seen: seg.start,
          last_seen: seg.end,
        });
      }
    }

    return {
      segments: namedSegments,
      speakers: [...speakerMap.values()],
    };
  }
}
