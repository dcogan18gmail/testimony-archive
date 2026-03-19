import { describe, it, expect } from "vitest";
import { ACCEPTED_AUDIO_TYPES_SET, MAX_FILE_SIZE } from "@/lib/upload-constants";

describe("file validation", () => {
  describe("accepted types", () => {
    it("accepts MP3 files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("audio/mpeg")).toBe(true);
    });

    it("accepts WAV files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("audio/wav")).toBe(true);
    });

    it("accepts M4A files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("audio/mp4")).toBe(true);
      expect(ACCEPTED_AUDIO_TYPES_SET.has("audio/x-m4a")).toBe(true);
    });

    it("accepts FLAC files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("audio/flac")).toBe(true);
    });

    it("accepts OGG files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("audio/ogg")).toBe(true);
    });

    it("accepts WebM files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("audio/webm")).toBe(true);
    });

    it("rejects video files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("video/mp4")).toBe(false);
    });

    it("rejects image files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("image/png")).toBe(false);
    });

    it("rejects text files", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("text/plain")).toBe(false);
    });

    it("rejects empty MIME type", () => {
      expect(ACCEPTED_AUDIO_TYPES_SET.has("")).toBe(false);
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
