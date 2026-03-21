import { describe, it, expect, vi, beforeEach } from "vitest";

let queryResult: unknown[] = [];

vi.mock("@/lib/auth-guard", () => ({
  getAuthenticatedUserId: vi.fn(() => Promise.resolve("test-user-id")),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(queryResult),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/schema", () => ({
  interviews: {
    id: "id",
    userId: "user_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
  and: (...args: unknown[]) => args,
}));

// Mock Packer to avoid full docx generation in route tests
vi.mock("docx", () => ({
  Packer: {
    toBuffer: vi.fn(() => Promise.resolve(Buffer.from("fake-docx"))),
  },
  Document: vi.fn(),
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
  HeadingLevel: { HEADING_1: 1, HEADING_2: 2 },
  AlignmentType: { CENTER: "center" },
  BorderStyle: { SINGLE: "single" },
}));

vi.mock("@/lib/generate-docx", () => ({
  generateDocx: vi.fn(() => ({})),
}));

import { GET } from "@/app/api/interviews/[id]/export/route";
import { NextRequest } from "next/server";

function makeRequest(id: string, format?: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const url = format
    ? `http://localhost:3000/api/interviews/${id}/export?format=${format}`
    : `http://localhost:3000/api/interviews/${id}/export`;

  return [
    new NextRequest(url),
    { params: Promise.resolve({ id }) },
  ];
}

const fakeInterview = {
  id: "test-id",
  originalFilename: "test.mp3",
  createdAt: new Date("2024-01-15"),
  status: "completed",
  detectedLanguage: "French",
  durationSeconds: 120,
  summary: "A test summary",
  speakerRoster: [{ id: "s1", name: "Speaker 1", segment_count: 1, first_seen: 0, last_seen: 10 }],
  transcriptEnglish: [{ speaker: "Speaker 1", start: 0, end: 10, text_english: "Hello", text_original: "Bonjour" }],
  transcriptOriginal: [{ speaker: "Speaker 1", start: 0, end: 10, text_english: "Hello", text_original: "Bonjour" }],
  eventName: null,
  eventLocation: null,
  interviewer: null,
  organization: null,
  audioBlobUrl: null,
  currentStep: null,
  errorMessage: null,
};

describe("GET /api/interviews/[id]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = [];
  });

  it("returns 400 for invalid format", async () => {
    const [req, ctx] = makeRequest("test-id", "pdf");
    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid format");
  });

  it("returns 404 when interview not found", async () => {
    queryResult = [];

    const [req, ctx] = makeRequest("nonexistent-id", "english");
    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Interview not found");
  });

  it("returns 400 when no transcript available", async () => {
    queryResult = [{ ...fakeInterview, transcriptEnglish: null }];

    const [req, ctx] = makeRequest("test-id", "english");
    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("No transcript");
  });

  it("returns 400 for original format when no original transcript", async () => {
    queryResult = [{ ...fakeInterview, transcriptOriginal: null }];

    const [req, ctx] = makeRequest("test-id", "original");
    const response = await GET(req, ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Original language");
  });

  it("returns docx file with correct headers", async () => {
    queryResult = [fakeInterview];

    const [req, ctx] = makeRequest("test-id", "english");
    const response = await GET(req, ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("wordprocessingml.document");
    expect(response.headers.get("Content-Disposition")).toContain("test_english.docx");
  });

  it("defaults to english format when no format specified", async () => {
    queryResult = [fakeInterview];

    const [req, ctx] = makeRequest("test-id");
    const response = await GET(req, ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("english.docx");
  });
});
