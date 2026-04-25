/**
 * Concurrent request integration tests for the SnapOtter image API.
 *
 * Tests that the server handles parallel and rapid sequential requests
 * correctly without data corruption, crashes, or race conditions.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, createMultipartPayload, loginAsAdmin, type TestApp } from "./test-server.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FIXTURES = join(__dirname, "..", "fixtures");
const PNG_200x150 = readFileSync(join(FIXTURES, "test-200x150.png"));
const JPG_100x100 = readFileSync(join(FIXTURES, "test-100x100.jpg"));

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
let testApp: TestApp;
let app: TestApp["app"];
let adminToken: string;

beforeAll(async () => {
  testApp = await buildTestApp();
  app = testApp.app;
  adminToken = await loginAsAdmin(app);
}, 30_000);

afterAll(async () => {
  await testApp.cleanup();
}, 10_000);

/** Helper to build an inject config for a tool request. */
function buildToolRequest(
  toolId: string,
  image: Buffer,
  filename: string,
  settings: Record<string, unknown>,
) {
  const { body, contentType } = createMultipartPayload([
    { name: "file", filename, content: image, contentType: "image/png" },
    { name: "settings", content: JSON.stringify(settings) },
  ]);
  return {
    method: "POST" as const,
    url: `/api/v1/tools/${toolId}`,
    headers: { "content-type": contentType, authorization: `Bearer ${adminToken}` },
    body,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PARALLEL UPLOADS TO SAME TOOL
// ═══════════════════════════════════════════════════════════════════════════
describe("Parallel uploads to the same tool", () => {
  it("handles 5 simultaneous resize requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        app.inject(
          buildToolRequest("resize", PNG_200x150, `parallel-${i}.png`, { width: 50 + i * 10 }),
        ),
      ),
    );

    for (const res of results) {
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.jobId).toBeDefined();
      expect(json.downloadUrl).toBeDefined();
    }

    // Each request should get a unique jobId
    const jobIds = results.map((r) => JSON.parse(r.body).jobId);
    const uniqueJobIds = new Set(jobIds);
    expect(uniqueJobIds.size).toBe(5);
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// PARALLEL UPLOADS TO DIFFERENT TOOLS
// ═══════════════════════════════════════════════════════════════════════════
describe("Parallel uploads to different tools", () => {
  it("handles resize + rotate + compress simultaneously", async () => {
    const [resizeRes, rotateRes, compressRes] = await Promise.all([
      app.inject(buildToolRequest("resize", PNG_200x150, "resize.png", { width: 100 })),
      app.inject(buildToolRequest("rotate", PNG_200x150, "rotate.png", { angle: 90 })),
      app.inject(buildToolRequest("compress", PNG_200x150, "compress.png", { quality: 50 })),
    ]);

    expect(resizeRes.statusCode).toBe(200);
    expect(rotateRes.statusCode).toBe(200);
    expect(compressRes.statusCode).toBe(200);

    // Each result should have a distinct jobId
    const ids = [resizeRes, rotateRes, compressRes].map((r) => JSON.parse(r.body).jobId);
    expect(new Set(ids).size).toBe(3);
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// RAPID SEQUENTIAL REQUESTS
// ═══════════════════════════════════════════════════════════════════════════
describe("Rapid sequential requests", () => {
  it("handles 10 requests in quick succession", async () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      const res = await app.inject(
        buildToolRequest("resize", PNG_200x150, `rapid-${i}.png`, { width: 80 }),
      );
      results.push(res);
    }

    for (const res of results) {
      expect(res.statusCode).toBe(200);
    }

    // All should produce unique job IDs
    const jobIds = results.map((r) => JSON.parse(r.body).jobId);
    expect(new Set(jobIds).size).toBe(10);
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERLEAVED UPLOADS
// ═══════════════════════════════════════════════════════════════════════════
describe("Interleaved uploads", () => {
  it("processes two resize requests started nearly simultaneously", async () => {
    // Start both at the same time — both should complete independently
    const [first, second] = await Promise.all([
      app.inject(buildToolRequest("resize", PNG_200x150, "interleave-a.png", { width: 120 })),
      app.inject(buildToolRequest("resize", JPG_100x100, "interleave-b.jpg", { width: 60 })),
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);

    const firstBody = JSON.parse(first.body);
    const secondBody = JSON.parse(second.body);

    // Each should get its own job ID and download URL
    expect(firstBody.jobId).not.toBe(secondBody.jobId);
    expect(firstBody.downloadUrl).not.toBe(secondBody.downloadUrl);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONCURRENT MIX OF VALID AND INVALID REQUESTS
// ═══════════════════════════════════════════════════════════════════════════
describe("Concurrent mix of valid and invalid requests", () => {
  it("handles a mix of valid and invalid requests without cross-contamination", async () => {
    const corruptedJpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from("garbage data that is not a real image"),
    ]);

    const [validRes, invalidRes, anotherValidRes] = await Promise.all([
      app.inject(buildToolRequest("resize", PNG_200x150, "valid.png", { width: 100 })),
      app.inject(buildToolRequest("resize", corruptedJpeg, "invalid.jpg", { width: 100 })),
      app.inject(buildToolRequest("rotate", PNG_200x150, "also-valid.png", { angle: 45 })),
    ]);

    // Valid requests should succeed
    expect(validRes.statusCode).toBe(200);
    expect(anotherValidRes.statusCode).toBe(200);

    // Invalid request should fail gracefully
    expect([400, 422]).toContain(invalidRes.statusCode);

    // The invalid request should not affect the valid ones
    expect(JSON.parse(validRes.body).jobId).toBeDefined();
    expect(JSON.parse(anotherValidRes.body).jobId).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10 SIMULTANEOUS UPLOADS TO SAME ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════
describe("10 simultaneous uploads to the same tool", () => {
  it("handles 10 concurrent resize requests with distinct widths", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        app.inject(
          buildToolRequest("resize", PNG_200x150, `concurrent-${i}.png`, { width: 20 + i * 10 }),
        ),
      ),
    );

    for (const res of results) {
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.jobId).toBeDefined();
      expect(json.downloadUrl).toBeDefined();
    }

    // All 10 must produce unique job IDs
    const jobIds = results.map((r) => JSON.parse(r.body).jobId);
    expect(new Set(jobIds).size).toBe(10);
  }, 60_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// MIXED TOOL REQUESTS IN PARALLEL — VERIFY NO RESPONSE CORRUPTION
// ═══════════════════════════════════════════════════════════════════════════
describe("Mixed tool requests in parallel with result verification", () => {
  it("resize + crop + rotate + compress simultaneously produce correct results", async () => {
    const [resizeRes, cropRes, rotateRes, compressRes] = await Promise.all([
      app.inject(buildToolRequest("resize", PNG_200x150, "mix-resize.png", { width: 50 })),
      app.inject(
        buildToolRequest("crop", PNG_200x150, "mix-crop.png", {
          left: 0,
          top: 0,
          width: 100,
          height: 100,
        }),
      ),
      app.inject(buildToolRequest("rotate", PNG_200x150, "mix-rotate.png", { angle: 180 })),
      app.inject(buildToolRequest("compress", PNG_200x150, "mix-compress.png", { quality: 30 })),
    ]);

    // All must succeed
    expect(resizeRes.statusCode).toBe(200);
    expect(cropRes.statusCode).toBe(200);
    expect(rotateRes.statusCode).toBe(200);
    expect(compressRes.statusCode).toBe(200);

    // All must have unique job IDs
    const ids = [resizeRes, cropRes, rotateRes, compressRes].map((r) => JSON.parse(r.body).jobId);
    expect(new Set(ids).size).toBe(4);

    // Resize output should be smaller than original
    const resizeBody = JSON.parse(resizeRes.body);
    expect(resizeBody.processedSize).toBeLessThan(resizeBody.originalSize);

    // Crop output should be smaller than original
    const cropBody = JSON.parse(cropRes.body);
    expect(cropBody.processedSize).toBeLessThan(cropBody.originalSize);

    // Download URLs must reference the correct tool suffix
    expect(resizeBody.downloadUrl).toContain("resize");
    expect(cropBody.downloadUrl).toContain("crop");
    expect(JSON.parse(rotateRes.body).downloadUrl).toContain("rotate");
    expect(JSON.parse(compressRes.body).downloadUrl).toContain("compress");
  }, 30_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// CONCURRENT REQUESTS WITH DIFFERENT IMAGE FORMATS
// ═══════════════════════════════════════════════════════════════════════════
describe("Concurrent requests with different image formats", () => {
  it("processes PNG and JPEG simultaneously without cross-format contamination", async () => {
    const results = await Promise.all([
      app.inject(buildToolRequest("resize", PNG_200x150, "format-a.png", { width: 80 })),
      app.inject(buildToolRequest("resize", JPG_100x100, "format-b.jpg", { width: 50 })),
      app.inject(buildToolRequest("resize", PNG_200x150, "format-c.png", { width: 60 })),
      app.inject(buildToolRequest("resize", JPG_100x100, "format-d.jpg", { width: 40 })),
    ]);

    for (const res of results) {
      expect(res.statusCode).toBe(200);
    }

    // All unique job IDs
    const ids = results.map((r) => JSON.parse(r.body).jobId);
    expect(new Set(ids).size).toBe(4);
  }, 30_000);
});
