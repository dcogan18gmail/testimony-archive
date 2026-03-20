import { describe, it, expect, vi, beforeEach } from "vitest";
import { transcribeChunk, transcribeAllChunks } from "@/lib/whisper";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("transcribeChunk", () => {
  it("returns segments with offset timestamps", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          segments: [
            { start: 0, end: 5, text: " Hello world " },
            { start: 5, end: 10, text: " How are you " },
          ],
        }),
    });

    const segments = await transcribeChunk(new Uint8Array([1, 2, 3]), 0, 30, "test-key");
    expect(segments).toHaveLength(2);
    expect(segments[0].start).toBe(30); // offset applied
    expect(segments[0].end).toBe(35);
    expect(segments[0].text).toBe("Hello world"); // trimmed
    expect(segments[1].start).toBe(35);
  });

  it("throws on API error with message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: "Invalid key" } }),
    });

    await expect(transcribeChunk(new Uint8Array([1]), 0, 0, "bad")).rejects.toThrow("Invalid key");
  });

  it("handles empty segments response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ segments: [] }),
    });

    const segments = await transcribeChunk(new Uint8Array([1]), 0, 0, "key");
    expect(segments).toHaveLength(0);
  });
});

describe("transcribeAllChunks", () => {
  it("processes all chunks sequentially and reports progress", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          segments: [{ start: 0, end: 5, text: "test" }],
        }),
    });

    const onProgress = vi.fn();
    const chunks = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];
    const segments = await transcribeAllChunks(chunks, 30, "key", onProgress);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenCalledWith(1, 3);
    expect(onProgress).toHaveBeenCalledWith(2, 3);
    expect(onProgress).toHaveBeenCalledWith(3, 3);
    // Segments should have different offsets
    expect(segments[0].start).toBe(0);   // chunk 0, offset 0
    expect(segments[1].start).toBe(30);  // chunk 1, offset 30
    expect(segments[2].start).toBe(60);  // chunk 2, offset 60
  });
});
