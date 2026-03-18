CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'processing',
  current_step TEXT,
  error_message TEXT,
  original_filename TEXT NOT NULL,
  duration_seconds FLOAT,
  detected_language TEXT,
  speaker_roster JSONB DEFAULT '[]',
  event_name TEXT,
  event_location TEXT,
  interviewer TEXT,
  organization TEXT,
  summary TEXT,
  transcript_english JSONB,
  transcript_original JSONB,
  audio_blob_url TEXT
);
