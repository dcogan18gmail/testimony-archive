import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for GET /api/interviews (list)
 * Verifies the projection includes metadata fields.
 */

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockOrderBy = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs);
          return {
            orderBy: (...oArgs: unknown[]) => {
              mockOrderBy(...oArgs);
              return Promise.resolve([]);
            },
          };
        },
      };
    },
  },
}));

vi.mock("drizzle-orm", () => ({
  desc: (col: unknown) => ({ desc: col }),
}));

vi.mock("@/lib/schema", () => ({
  interviews: {
    id: "id",
    originalFilename: "original_filename",
    createdAt: "created_at",
    status: "status",
    detectedLanguage: "detected_language",
    durationSeconds: "duration_seconds",
    summary: "summary",
    speakerRoster: "speaker_roster",
    currentStep: "current_step",
    errorMessage: "error_message",
    eventName: "event_name",
    eventLocation: "event_location",
    interviewer: "interviewer",
    organization: "organization",
  },
}));

import { GET } from "@/app/api/interviews/route";

describe("GET /api/interviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes metadata fields in the projection", async () => {
    const res = await GET();

    expect(res.status).toBe(200);

    // The select call should include all metadata fields
    const projection = mockSelect.mock.calls[0][0];
    expect(projection).toHaveProperty("eventName");
    expect(projection).toHaveProperty("eventLocation");
    expect(projection).toHaveProperty("interviewer");
    expect(projection).toHaveProperty("organization");
  });
});
