import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { createMockDb } from "./test-utils/testDb";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: getDbMock,
}));

import {
  buildDemoMediaUrl,
  createDemoMediaBlob,
  deleteDemoMediaBlob,
  extractDemoMediaBlobIdFromUrl,
  getDemoMediaBlobById,
} from "./demoMediaStorage";

describe("demoMediaStorage", () => {
  let database: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    database = createMockDb();
    getDbMock.mockResolvedValue(database);
  });

  it("stores and loads uploaded bytes", async () => {
    const payload = Buffer.from("demo-image-bytes");
    const { id } = await createDemoMediaBlob({
      fileName: "demo.png",
      contentType: "image/png",
      bytes: payload,
      uploadedBy: 1,
      batchId: 42,
    });

    const record = await getDemoMediaBlobById(id);
    expect(record).not.toBeNull();
    expect(record?.fileName).toBe("demo.png");
    expect(record?.contentType).toBe("image/png");
    expect(record?.fileSize).toBe(payload.length);
    expect(record?.bytes.toString("utf-8")).toBe("demo-image-bytes");
  });

  it("deletes by id", async () => {
    const { id } = await createDemoMediaBlob({
      fileName: "delete-me.jpg",
      contentType: "image/jpeg",
      bytes: Buffer.from("abc123"),
    });

    const deleted = await deleteDemoMediaBlob(id);
    expect(deleted).toBe(true);
  });

  it("builds and parses fallback URLs", () => {
    const req = {
      protocol: "https",
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "terp.example.com",
      },
      get: vi.fn((key: string) => {
        if (key === "host") return "localhost:3000";
        return undefined;
      }),
    } as unknown as Request;

    const url = buildDemoMediaUrl(req, "abc123def456");
    expect(url).toBe("https://terp.example.com/api/media/abc123def456");

    expect(extractDemoMediaBlobIdFromUrl(url)).toBe("abc123def456");
    expect(extractDemoMediaBlobIdFromUrl("/api/media/abc123def456")).toBe(
      "abc123def456"
    );
    expect(extractDemoMediaBlobIdFromUrl("/api/media/not valid")).toBeNull();
  });
});
