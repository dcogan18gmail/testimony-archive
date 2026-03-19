/** Audio MIME types accepted for upload. Used by both client validation and server token generation. */
export const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",       // .mp3
  "audio/mp4",        // .m4a
  "audio/wav",        // .wav
  "audio/x-wav",      // .wav (alternate mime)
  "audio/webm",       // .webm
  "audio/ogg",        // .ogg
  "audio/flac",       // .flac
  "audio/x-m4a",      // .m4a (alternate mime)
] as const;

export const ACCEPTED_AUDIO_TYPES_SET = new Set<string>(ACCEPTED_AUDIO_TYPES);

/** Maximum upload size in bytes (500MB). */
export const MAX_FILE_SIZE = 500 * 1024 * 1024;
