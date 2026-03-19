import { describe, it, expect, vi } from "vitest";
import { ACCEPTED_AUDIO_TYPES, MAX_FILE_SIZE } from "@/lib/upload-constants";

/**
 * Tests for POST /api/upload
 *
 * This route handles Vercel Blob client uploads. It receives a JSON body
 * (not file bytes) and delegates to handleUpload() from @vercel/blob/client.
 * We mock handleUpload to test our route logic in isolation.
 */

// Mock handleUpload before importing the route
vi.mock("@vercel/blob/client", () => ({
  handleUpload: vi.fn(),
}));

import { POST } from "@/app/api/upload/route";
import { handleUpload } from "@vercel/blob/client";

const mockedHandleUpload = vi.mocked(handleUpload);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/upload", () => {
  it("returns the handleUpload response on success", async () => {
    const tokenResponse = {
      type: "blob.generate-client-token" as const,
      clientToken: "test-token-123",
    };
    mockedHandleUpload.mockResolvedValue(tokenResponse);

    const request = makeRequest({
      type: "blob.generate-client-token",
      payload: { pathname: "test.mp3", multipart: false, clientPayload: null },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.clientToken).toBe("test-token-123");
  });

  it("returns 400 when handleUpload throws", async () => {
    mockedHandleUpload.mockRejectedValue(new Error("Invalid token request"));

    const request = makeRequest({ type: "bad-type" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid token request");
  });

  it("passes onBeforeGenerateToken with correct content types", async () => {
    mockedHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      // Call the callback to verify it returns the right config
      const config = await onBeforeGenerateToken("test.mp3", null, false);
      expect(config.allowedContentTypes).toEqual([...ACCEPTED_AUDIO_TYPES]);
      expect(config.maximumSizeInBytes).toBe(MAX_FILE_SIZE);

      return { type: "blob.generate-client-token" as const, clientToken: "t" };
    });

    const request = makeRequest({
      type: "blob.generate-client-token",
      payload: { pathname: "test.mp3", multipart: false, clientPayload: null },
    });

    await POST(request);
    expect(mockedHandleUpload).toHaveBeenCalled();
  });
});
