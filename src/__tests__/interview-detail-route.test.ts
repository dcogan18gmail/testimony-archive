import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Tests for GET/DELETE /api/interviews/[id]
 */

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockDelete = vi.fn();
const mockDeleteWhere = vi.fn();
const mockDeleteReturning = vi.fn();

// Default return values are set in beforeEach; tests override as needed
vi.mock("@/lib/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return {
        from: (...fArgs: unknown[]) => {
          mockFrom(...fArgs);
          return {
            where: (...wArgs: unknown[]) => {
              mockWhere(...wArgs);
              return mockWhere();
            },
          };
        },
      };
    },
    delete: (...args: unknown[]) => {
      mockDelete(...args);
      return {
        where: (...wArgs: unknown[]) => {
          mockDeleteWhere(...wArgs);
          return {
            returning: (...rArgs: unknown[]) => {
              return mockDeleteReturning(...rArgs);
            },
          };
        },
      };
    },
  },
}));

const mockBlobDel = vi.fn();
vi.mock("@vercel/blob", () => ({
  del: (...args: unknown[]) => mockBlobDel(...args),
}));

vi.mock("@/lib/schema", () => ({
  interviews: {
    id: "id",
    audioBlobUrl: "audio_blob_url",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

import { GET, DELETE } from "@/app/api/interviews/[id]/route";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/interviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockReturnValue(Promise.resolve([]));
    mockDeleteReturning.mockReturnValue(Promise.resolve([]));
  });

  it("returns 404 when interview not found", async () => {
    const req = new NextRequest("http://localhost:3000/api/interviews/abc");
    const res = await GET(req, makeParams("abc"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Not found");
  });
});

describe("DELETE /api/interviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockReturnValue(Promise.resolve([]));
    mockDeleteReturning.mockReturnValue(Promise.resolve([]));
  });

  it("returns 404 when interview not found", async () => {
    const req = new NextRequest("http://localhost:3000/api/interviews/abc");
    const res = await DELETE(req, makeParams("abc"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Not found");
  });

  it("deletes interview and returns success", async () => {
    mockDeleteReturning.mockReturnValue(
      Promise.resolve([{ audioBlobUrl: null }])
    );

    const req = new NextRequest("http://localhost:3000/api/interviews/abc");
    const res = await DELETE(req, makeParams("abc"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockBlobDel).not.toHaveBeenCalled();
  });

  it("attempts blob cleanup when audioBlobUrl exists", async () => {
    const blobUrl = "https://blob.vercel-storage.com/test.mp3";
    mockDeleteReturning.mockReturnValue(
      Promise.resolve([{ audioBlobUrl: blobUrl }])
    );
    mockBlobDel.mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost:3000/api/interviews/abc");
    const res = await DELETE(req, makeParams("abc"));

    expect(res.status).toBe(200);
    expect(mockBlobDel).toHaveBeenCalledWith(blobUrl);
  });

  it("succeeds even when blob cleanup fails", async () => {
    mockDeleteReturning.mockReturnValue(
      Promise.resolve([{ audioBlobUrl: "https://blob.vercel-storage.com/test.mp3" }])
    );
    mockBlobDel.mockRejectedValue(new Error("Blob not found"));

    const req = new NextRequest("http://localhost:3000/api/interviews/abc");
    const res = await DELETE(req, makeParams("abc"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
