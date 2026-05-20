import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitToAssemblyAI, pollAssemblyAI } from "@/lib/assemblyai";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("submitToAssemblyAI", () => {
  it("submits audio URL and returns transcript ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "abc123" }),
    });

    const id = await submitToAssemblyAI("https://example.com/audio.mp3", "test-key");
    expect(id).toBe("abc123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.assemblyai.com/v2/transcript",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          audio_url: "https://example.com/audio.mp3",
          speaker_labels: true,
          language_detection: true,
          speech_models: ["universal-3-pro", "universal-2"],
        }),
      })
    );
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });

    await expect(submitToAssemblyAI("https://example.com/audio.mp3", "bad-key")).rejects.toThrow("Unauthorized");
  });
});

describe("pollAssemblyAI", () => {
  it("returns completed result with utterances converted from ms to seconds", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "completed",
          utterances: [
            { speaker: "A", start: 1000, end: 5000, text: " Hello " },
          ],
          language_code: "fr",
        }),
    });

    const result = await pollAssemblyAI("abc123", "test-key");
    expect(result.status).toBe("completed");
    expect(result.utterances).toHaveLength(1);
    expect(result.utterances[0].start).toBe(1);
    expect(result.utterances[0].end).toBe(5);
    expect(result.utterances[0].text).toBe("Hello");
    expect(result.detectedLanguage).toBe("fr");
  });

  it("returns processing status when not yet complete", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "processing" }),
    });

    const result = await pollAssemblyAI("abc123", "test-key");
    expect(result.status).toBe("processing");
    expect(result.utterances).toHaveLength(0);
  });

  it("returns error status", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "error", error: "Bad audio" }),
    });

    const result = await pollAssemblyAI("abc123", "test-key");
    expect(result.status).toBe("error");
    expect(result.error).toBe("Bad audio");
  });
});
