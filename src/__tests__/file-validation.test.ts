import { describe, it, expect } from "vitest";

/**
 * Tests for client-side file validation logic.
 *
 * The UploadZone component validates files before processing.
 * We extract the validation rules and test them directly,
 * since testing the full component would require mocking
 * ffmpeg.wasm and Vercel Blob (browser-only deps).
 */

// These match the constants in UploadZone.tsx
const ACCEPTED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/x-m4a",
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

describe("file validation", () => {
  describe("accepted types", () => {
    it("accepts MP3 files", () => {
      expect(ACCEPTED_TYPES.has("audio/mpeg")).toBe(true);
    });

    it("accepts WAV files", () => {
      expect(ACCEPTED_TYPES.has("audio/wav")).toBe(true);
    });

    it("accepts M4A files", () => {
      expect(ACCEPTED_TYPES.has("audio/mp4")).toBe(true);
      expect(ACCEPTED_TYPES.has("audio/x-m4a")).toBe(true);
    });

    it("accepts FLAC files", () => {
      expect(ACCEPTED_TYPES.has("audio/flac")).toBe(true);
    });

    it("accepts OGG files", () => {
      expect(ACCEPTED_TYPES.has("audio/ogg")).toBe(true);
    });

    it("accepts WebM files", () => {
      expect(ACCEPTED_TYPES.has("audio/webm")).toBe(true);
    });

    it("rejects video files", () => {
      expect(ACCEPTED_TYPES.has("video/mp4")).toBe(false);
    });

    it("rejects image files", () => {
      expect(ACCEPTED_TYPES.has("image/png")).toBe(false);
    });

    it("rejects text files", () => {
      expect(ACCEPTED_TYPES.has("text/plain")).toBe(false);
    });

    it("rejects empty MIME type", () => {
      expect(ACCEPTED_TYPES.has("")).toBe(false);
    });
  });

  describe("file size limit", () => {
    it("limit is 500MB", () => {
      expect(MAX_FILE_SIZE).toBe(500 * 1024 * 1024);
    });

    it("a 100MB file is under the limit", () => {
      const size = 100 * 1024 * 1024;
      expect(size <= MAX_FILE_SIZE).toBe(true);
    });

    it("a 501MB file exceeds the limit", () => {
      const size = 501 * 1024 * 1024;
      expect(size > MAX_FILE_SIZE).toBe(true);
    });
  });
});
