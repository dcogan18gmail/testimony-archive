export type TranscriptSegment = {
  speaker: string;
  start: number;
  end: number;
  text_english: string;
  text_original: string;
};

export type SpeakerInfo = {
  id: string;
  name: string;
  segment_count: number;
  first_seen: number;
  last_seen: number;
};

export type InterviewStatus = "processing" | "completed" | "error";

export type ProcessingStep =
  | "uploading"
  | "transcribing"
  | "identifying_speakers"
  | "summarizing"
  | "finalizing";
