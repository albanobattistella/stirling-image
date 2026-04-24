/**
 * Integration tests for the batch processing route (batch.ts).
 *
 * Covers edge cases: filename deduplication, partial failure handling,
 * clientJobId passthrough, file results header, invalid settings,
 * non-existent tools, and ZIP response format validation.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import AdmZip from "adm-zip";
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

// ── ZIP response validation ─────────────────────────────────────
describe("ZIP response format", () => {
  it("returns valid ZIP with correct entry count", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
      { name: "settings", content: JSON.stringify({ width: 50 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/zip");

    const zip = new AdmZip(res.rawPayload);
    const entries = zip.getEntries();
    expect(entries.length).toBe(2);
  });

  it("includes Content-Disposition header with tool name", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "test.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify({ width: 100 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const disposition = res.headers["content-disposition"] as string;
    expect(disposition).toContain("batch-resize");
  });
});

// ── Filename deduplication ──────────────────────────────────────
describe("Filename deduplication in batch", () => {
  it("deduplicates identical output filenames", async () => {
    // Upload two files with the same name — output names should be deduped
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "same.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "same.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify({ width: 50 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);

    const zip = new AdmZip(res.rawPayload);
    const names = zip.getEntries().map((e) => e.entryName);
    // Names should be unique
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

// ── X-File-Results header ───────────────────────────────────────
describe("X-File-Results header", () => {
  it("maps file indices to output filenames", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "first.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "second.jpg", contentType: "image/jpeg", content: JPG },
      { name: "settings", content: JSON.stringify({ width: 80 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const fileResults = JSON.parse(res.headers["x-file-results"] as string);
    expect(fileResults).toBeDefined();
    // Should have entries for index 0 and 1
    expect(fileResults["0"]).toBeDefined();
    expect(fileResults["1"]).toBeDefined();
  });
});

// ── ClientJobId passthrough ─────────────────────────────────────
describe("ClientJobId passthrough", () => {
  it("uses provided clientJobId in response header", async () => {
    const clientJobId = "my-custom-batch-id-42";

    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "test.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify({ width: 100 }) },
      { name: "clientJobId", content: clientJobId },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-job-id"]).toBe(clientJobId);
  });

  it("generates a job ID when clientJobId is not provided", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "test.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify({ width: 100 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-job-id"]).toBeDefined();
    expect((res.headers["x-job-id"] as string).length).toBeGreaterThan(0);
  });
});

// ── Error handling ──────────────────────────────────────────────
describe("Batch error handling", () => {
  it("returns 404 for non-existent tool", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "test.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify({}) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/totally-fake-tool/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(404);
    const result = JSON.parse(res.body);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns 400 for no files in batch", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "settings", content: JSON.stringify({ width: 100 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    const result = JSON.parse(res.body);
    expect(result.error).toMatch(/no image/i);
  });

  it("returns 400 for invalid settings JSON", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "test.png", contentType: "image/png", content: PNG },
      { name: "settings", content: "not-json-at-all" },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid tool settings", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "test.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify({ width: -100 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── Mixed format batch ──────────────────────────────────────────
describe("Mixed format batch", () => {
  it("processes PNG, JPG, and WebP in a single batch", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "a.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "b.jpg", contentType: "image/jpeg", content: JPG },
      { name: "file", filename: "c.webp", contentType: "image/webp", content: WEBP },
      { name: "settings", content: JSON.stringify({ width: 30 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);

    const zip = new AdmZip(res.rawPayload);
    expect(zip.getEntries().length).toBe(3);
  });
});

// ── Batch with default settings ─────────────────────────────────
describe("Batch with default settings", () => {
  it("uses default settings when settings field is omitted", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "test.png", contentType: "image/png", content: PNG },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/strip-metadata/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/zip");
  });
});

// ── Batch preserves upload order ────────────────────────────────
describe("Batch preserves upload order", () => {
  it("X-File-Results indices match upload order", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "alpha.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "beta.jpg", contentType: "image/jpeg", content: JPG },
      { name: "file", filename: "gamma.webp", contentType: "image/webp", content: WEBP },
      { name: "settings", content: JSON.stringify({ width: 40 }) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const fileResults = JSON.parse(res.headers["x-file-results"] as string);

    // Index 0 should be derived from alpha, 1 from beta, 2 from gamma
    expect(fileResults["0"]).toContain("alpha");
    expect(fileResults["1"]).toContain("beta");
    expect(fileResults["2"]).toContain("gamma");
  });
});
