import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for POST /api/interviews
 *
 * This route creates a new interview row in the database after
 * a file has been uploaded to Vercel Blob. We mock the database
 * to test validation logic and error handling.
 */

// Mock the database module
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("@/lib/auth-guard", () => ({
  getAuthenticatedUserId: vi.fn(() => Promise.resolve("test-user-id")),
}));

vi.mock("@/lib/schema", () => ({
  interviews: { id: "id", userId: "userId" },
  users: {},
  accounts: {},
  sessions: {},
  verificationTokens: {},
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return {
        values: (...vArgs: unknown[]) => {
          mockValues(...vArgs);
          return {
            returning: (...rArgs: unknown[]) => {
              mockReturning(...rArgs);
              // Default: return a fake row
              return Promise.resolve([{ id: "test-uuid-123" }]);
            },
          };
        },
      };
    },
  },
}));

import { POST } from "@/app/api/interviews/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/interviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an interview and returns the id", async () => {
    const request = makeRequest({
      filename: "test-audio.mp3",
      blobUrl: "https://blob.vercel-storage.com/test-audio.mp3",
      durationSeconds: 120,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("test-uuid-123");
  });

  it("passes correct values to the database", async () => {
    const request = makeRequest({
      filename: "my-file.wav",
      blobUrl: "https://blob.vercel-storage.com/my-file.wav",
      durationSeconds: 45.5,
    });

    await POST(request);

    expect(mockValues).toHaveBeenCalledWith({
      userId: "test-user-id",
      originalFilename: "my-file.wav",
      audioBlobUrl: "https://blob.vercel-storage.com/my-file.wav",
      durationSeconds: 45.5,
      status: "processing",
      currentStep: "uploading",
    });
  });

  it("returns 400 when filename is missing", async () => {
    const request = makeRequest({
      blobUrl: "https://blob.vercel-storage.com/test.mp3",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("filename is required");
  });

  it("returns 400 when blobUrl is missing", async () => {
    const request = makeRequest({
      filename: "test.mp3",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("blobUrl is required");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new Request("http://localhost:3000/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("handles missing durationSeconds gracefully", async () => {
    const request = makeRequest({
      filename: "test.mp3",
      blobUrl: "https://blob.vercel-storage.com/test.mp3",
    });

    await POST(request);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: null,
      })
    );
  });
});
