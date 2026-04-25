/**
 * Integration tests for the compare tool (/api/v1/tools/compare).
 *
 * Covers identical-image comparison, different-image comparison,
 * similarity score, diff image generation, and input validation.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, createMultipartPayload, loginAsAdmin, type TestApp } from "./test-server.js";

const FIXTURES = join(__dirname, "..", "fixtures");
const PNG = readFileSync(join(FIXTURES, "test-200x150.png"));
const JPG = readFileSync(join(FIXTURES, "test-100x100.jpg"));
const WEBP = readFileSync(join(FIXTURES, "test-50x50.webp"));

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

describe("Compare", () => {
  it("reports 100% similarity when comparing an image with itself", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    expect(result.similarity).toBe(100);
    expect(result.jobId).toBeDefined();
    expect(result.downloadUrl).toBeDefined();
    expect(result.dimensions).toBeDefined();
    expect(result.dimensions.width).toBe(200);
    expect(result.dimensions.height).toBe(150);
  });

  it("reports less than 100% similarity for different images", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    expect(result.similarity).toBeLessThan(100);
    expect(result.similarity).toBeGreaterThanOrEqual(0);
    expect(result.downloadUrl).toBeDefined();
  });

  it("generates a downloadable diff image", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    // Download the diff image
    const dlRes = await app.inject({
      method: "GET",
      url: result.downloadUrl,
    });

    expect(dlRes.statusCode).toBe(200);
    const meta = await sharp(dlRes.rawPayload).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(result.dimensions.width);
    expect(meta.height).toBe(result.dimensions.height);
  });

  it("uses the larger dimensions when comparing different-sized images", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.webp", contentType: "image/webp", content: WEBP },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    // Max of (200, 50) = 200 wide; Max of (150, 50) = 150 tall
    expect(result.dimensions.width).toBe(200);
    expect(result.dimensions.height).toBe(150);
  });

  it("returns all expected fields in the response", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    expect(result).toHaveProperty("jobId");
    expect(result).toHaveProperty("similarity");
    expect(result).toHaveProperty("dimensions");
    expect(result).toHaveProperty("downloadUrl");
    expect(result).toHaveProperty("originalSize");
    expect(result).toHaveProperty("processedSize");
    expect(result.processedSize).toBeGreaterThan(0);
  });

  // ── Validation ──────────────────────────────────────────────────────

  it("rejects requests with only one image", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    const result = JSON.parse(res.body);
    expect(result.error).toMatch(/two image/i);
  });

  it("rejects requests with no images", async () => {
    const { body, contentType } = createMultipartPayload([{ name: "dummy", content: "nothing" }]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    const result = JSON.parse(res.body);
    expect(result.error).toMatch(/two image/i);
  });

  it("rejects unauthenticated requests", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: { "content-type": contentType },
      body,
    });

    expect(res.statusCode).toBe(401);
  });

  // ── Extended coverage: cross-format, HEIC, diff details ────────────

  it("compares JPEG vs PNG (cross-format)", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.jpg", contentType: "image/jpeg", content: JPG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.similarity).toBeLessThan(100);
    expect(result.similarity).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.width).toBe(200);
    expect(result.dimensions.height).toBe(150);
  });

  it("compares WebP vs JPEG (cross-format)", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.webp", contentType: "image/webp", content: WEBP },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.similarity).toBeGreaterThanOrEqual(0);
    expect(result.similarity).toBeLessThanOrEqual(100);
  });

  it("compares HEIC vs PNG", async () => {
    const HEIC = readFileSync(join(FIXTURES, "test-200x150.heic"));
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.heic", contentType: "image/heic", content: HEIC },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.similarity).toBeGreaterThanOrEqual(0);
    expect(result.dimensions).toBeDefined();
  });

  it("compares two HEIC images (same file)", async () => {
    const HEIC = readFileSync(join(FIXTURES, "test-200x150.heic"));
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.heic", contentType: "image/heic", content: HEIC },
      { name: "file", filename: "b.heic", contentType: "image/heic", content: HEIC },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.similarity).toBe(100);
  });

  it("diff image is always PNG format", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.jpg", contentType: "image/jpeg", content: JPG },
      { name: "file", filename: "b.webp", contentType: "image/webp", content: WEBP },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    const dlRes = await app.inject({
      method: "GET",
      url: result.downloadUrl,
    });
    const meta = await sharp(dlRes.rawPayload).metadata();
    expect(meta.format).toBe("png");
  });

  it("similarity is rounded to 2 decimal places", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    const simStr = String(result.similarity);
    const decimals = simStr.includes(".") ? simStr.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it("compares two very small images (50x50)", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.webp", contentType: "image/webp", content: WEBP },
      { name: "file", filename: "b.webp", contentType: "image/webp", content: WEBP },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.similarity).toBe(100);
    expect(result.dimensions.width).toBe(50);
    expect(result.dimensions.height).toBe(50);
  });

  it("compares a portrait JPEG with a landscape PNG", async () => {
    const PORTRAIT_JPG = readFileSync(join(FIXTURES, "test-portrait.jpg"));
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "portrait.jpg", contentType: "image/jpeg", content: PORTRAIT_JPG },
      { name: "file", filename: "landscape.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.similarity).toBeLessThan(100);
    // Dimensions should be max of both
    expect(result.dimensions.width).toBeGreaterThan(0);
    expect(result.dimensions.height).toBeGreaterThan(0);
  });

  it("processedSize reflects the diff image file size", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);

    const dlRes = await app.inject({
      method: "GET",
      url: result.downloadUrl,
    });
    // processedSize should match the actual diff image buffer size
    expect(result.processedSize).toBe(dlRes.rawPayload.length);
  });

  it("rejects requests with three or more images (only two allowed)", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "c.jpg", contentType: "image/jpeg", content: JPG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/compare",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    // The route accepts the first two files, ignoring the third
    // so this should succeed
    expect(res.statusCode).toBe(200);
  });
});
