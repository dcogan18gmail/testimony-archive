import { pgTable, uuid, timestamp, text, real, jsonb } from "drizzle-orm/pg-core";

export const interviews = pgTable("interviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").notNull().default("processing"),
  currentStep: text("current_step"),
  errorMessage: text("error_message"),
  originalFilename: text("original_filename").notNull(),
  durationSeconds: real("duration_seconds"),
  detectedLanguage: text("detected_language"),
  speakerRoster: jsonb("speaker_roster").default([]),
  eventName: text("event_name"),
  eventLocation: text("event_location"),
  interviewer: text("interviewer"),
  organization: text("organization"),
  summary: text("summary"),
  transcriptEnglish: jsonb("transcript_english"),
  transcriptOriginal: jsonb("transcript_original"),
  audioBlobUrl: text("audio_blob_url"),
});
