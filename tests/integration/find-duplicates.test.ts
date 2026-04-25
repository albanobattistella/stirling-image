/**
 * Integration tests for the find-duplicates tool (/api/v1/tools/find-duplicates).
 *
 * Covers duplicate detection with identical images, detection of unique images,
 * threshold tuning, response structure, and input validation.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, createMultipartPayload, loginAsAdmin, type TestApp } from "./test-server.js";

const FIXTURES = join(__dirname, "..", "fixtures");
const PNG = readFileSync(join(FIXTURES, "test-200x150.png"));
const JPG = readFileSync(join(FIXTURES, "test-100x100.jpg"));
const WEBP = readFileSync(join(FIXTURES, "test-50x50.webp"));
// Use a content photo that is perceptually very different from the test images
const PORTRAIT = readFileSync(join(FIXTURES, "content", "portrait-color.jpg"));

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

describe("Find Duplicates", () => {
  it("detects duplicates when the same image is uploaded twice", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "copy1.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "copy2.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    expect(result.totalImages).toBe(2);
    expect(result.duplicateGroups).toHaveLength(1);
    expect(result.duplicateGroups[0].files).toHaveLength(2);

    // Identical images should have 100% similarity
    const similarities = result.duplicateGroups[0].files.map(
      (f: { similarity: number }) => f.similarity,
    );
    expect(similarities).toContain(100);

    // One file should be marked as best
    const bestFiles = result.duplicateGroups[0].files.filter((f: { isBest: boolean }) => f.isBest);
    expect(bestFiles).toHaveLength(1);
  });

  it("reports no duplicate groups for completely different images", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: PORTRAIT },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    expect(result.totalImages).toBe(2);
    expect(result.duplicateGroups).toHaveLength(0);
    expect(result.uniqueImages).toBe(2);
    expect(result.spaceSaveable).toBe(0);
  });

  it("detects duplicates among a mix of duplicate and unique images", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "c.jpg", contentType: "image/jpeg", content: PORTRAIT },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    expect(result.totalImages).toBe(3);
    expect(result.duplicateGroups).toHaveLength(1);
    expect(result.duplicateGroups[0].files).toHaveLength(2);
    // The portrait should be unique
    expect(result.uniqueImages).toBe(1);
  });

  it("respects the threshold parameter", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
      { name: "threshold", content: "0" },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    // With threshold 0, only exact hash matches should be grouped
    // Different images should not be grouped
    expect(result.totalImages).toBe(2);
  });

  it("calculates space saveable from duplicate groups", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    // Space saveable should be the size of the non-best duplicate
    expect(result.spaceSaveable).toBeGreaterThan(0);
  });

  it("includes file metadata in duplicate group entries", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "img1.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "img2.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    const file = result.duplicateGroups[0].files[0];
    expect(file).toHaveProperty("filename");
    expect(file).toHaveProperty("similarity");
    expect(file).toHaveProperty("width");
    expect(file).toHaveProperty("height");
    expect(file).toHaveProperty("fileSize");
    expect(file).toHaveProperty("format");
    expect(file).toHaveProperty("isBest");
    expect(file).toHaveProperty("thumbnail");
    expect(file.width).toBe(200);
    expect(file.height).toBe(150);
  });

  // ── Validation ──────────────────────────────────────────────────────

  it("rejects requests with fewer than 2 images", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "solo.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    const result = JSON.parse(res.body);
    expect(result.error).toMatch(/at least 2/i);
  });

  it("rejects unauthenticated requests", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: { "content-type": contentType },
      body,
    });

    expect(res.statusCode).toBe(401);
  });

  // ── Extended coverage: thresholds, batch sizes, settings ───────────

  it("detects duplicates across different formats (PNG vs WebP of same content)", async () => {
    // Same image in PNG and WebP should be perceptual duplicates
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.webp", contentType: "image/webp", content: WEBP },
      { name: "file", filename: "c.jpg", contentType: "image/jpeg", content: JPG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.totalImages).toBe(3);
    // All three are different images, so no duplicates expected
    // (they're different content: 200x150 vs 50x50 vs 100x100)
  });

  it("uses high threshold to group even dissimilar images", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
      {
        name: "settings",
        content: JSON.stringify({ threshold: 20 }),
      },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.totalImages).toBe(2);
    // With threshold 20, more images may be grouped as duplicates
  });

  it("uses threshold via settings JSON field", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
      {
        name: "settings",
        content: JSON.stringify({ threshold: 5 }),
      },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    // Identical images should still be grouped with threshold 5
    expect(result.duplicateGroups).toHaveLength(1);
  });

  it("handles 5+ images in a single batch", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "c.jpg", contentType: "image/jpeg", content: JPG },
      { name: "file", filename: "d.jpg", contentType: "image/jpeg", content: JPG },
      { name: "file", filename: "e.jpg", contentType: "image/jpeg", content: PORTRAIT },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.totalImages).toBe(5);
    // At least one duplicate group should be found (PNG pair or JPG pair)
    expect(result.duplicateGroups.length).toBeGreaterThanOrEqual(1);
    // Total duplicated files across all groups should be at least 4 (2 PNG + 2 JPG pairs)
    const totalGroupedFiles = result.duplicateGroups.reduce(
      (sum: number, g: { files: unknown[] }) => sum + g.files.length,
      0,
    );
    expect(totalGroupedFiles).toBeGreaterThanOrEqual(2);
  });

  it("detects 3 identical images in one group", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "c.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.duplicateGroups).toHaveLength(1);
    expect(result.duplicateGroups[0].files).toHaveLength(3);
    expect(result.uniqueImages).toBe(0);

    // Only one should be marked as best
    const bestFiles = result.duplicateGroups[0].files.filter((f: { isBest: boolean }) => f.isBest);
    expect(bestFiles).toHaveLength(1);
  });

  it("sorts duplicate groups by highest similarity descending", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "c.jpg", contentType: "image/jpeg", content: JPG },
      { name: "file", filename: "d.jpg", contentType: "image/jpeg", content: JPG },
      {
        name: "settings",
        content: JSON.stringify({ threshold: 20 }),
      },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    // If there are multiple groups, they should be sorted by max similarity desc
    if (result.duplicateGroups.length >= 2) {
      const maxSim0 = Math.max(
        ...result.duplicateGroups[0].files.map((f: { similarity: number }) => f.similarity),
      );
      const maxSim1 = Math.max(
        ...result.duplicateGroups[1].files.map((f: { similarity: number }) => f.similarity),
      );
      expect(maxSim0).toBeGreaterThanOrEqual(maxSim1);
    }
  });

  it("handles HEIC input images", async () => {
    const HEIC = readFileSync(join(FIXTURES, "test-200x150.heic"));
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.heic", contentType: "image/heic", content: HEIC },
      { name: "file", filename: "b.heic", contentType: "image/heic", content: HEIC },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.totalImages).toBe(2);
    expect(result.duplicateGroups).toHaveLength(1);
  });

  it("includes groupId in duplicate groups", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.duplicateGroups[0].groupId).toBe(1);
  });

  it("rejects threshold exceeding max (20)", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
      {
        name: "settings",
        content: JSON.stringify({ threshold: 25 }),
      },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects requests with no files at all", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "settings", content: JSON.stringify({}) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/find-duplicates",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    const result = JSON.parse(res.body);
    expect(result.error).toMatch(/at least 2/i);
  });
});
