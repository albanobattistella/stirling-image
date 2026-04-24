/**
 * Integration tests for the SSE progress tracking system.
 *
 * The GET /api/v1/jobs/:jobId/progress endpoint uses reply.hijack()
 * for SSE streaming, which makes it incompatible with Fastify's inject()
 * (inject never completes for hijacked responses that wait for events).
 *
 * Instead, we test progress tracking indirectly through batch and pipeline
 * batch routes that drive updateJobProgress() and verify:
 *   - X-Job-Id header presence (job was tracked)
 *   - clientJobId passthrough (custom IDs are used)
 *   - Completed batch with progress tracking
 *   - Pipeline batch progress tracking
 *   - Job persistence in the database
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../apps/api/src/db/index.js";
import { buildTestApp, createMultipartPayload, loginAsAdmin, type TestApp } from "./test-server.js";

const FIXTURES = join(__dirname, "..", "fixtures");
const PNG = readFileSync(join(FIXTURES, "test-200x150.png"));
const JPG = readFileSync(join(FIXTURES, "test-100x100.jpg"));

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

// ── Batch progress tracking via X-Job-Id ────────────────────────
describe("Batch progress tracking", () => {
  it("assigns a job ID to batch operations", async () => {
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
    const jobId = res.headers["x-job-id"] as string;
    expect(jobId).toBeDefined();
    expect(jobId.length).toBeGreaterThan(0);
  });

  it("uses client-provided job ID when clientJobId is supplied", async () => {
    const clientJobId = randomUUID();

    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "track.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify({ width: 80 }) },
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

  it("persists job progress to the database after batch completes", async () => {
    const clientJobId = randomUUID();

    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "persist.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "persist2.jpg", contentType: "image/jpeg", content: JPG },
      { name: "settings", content: JSON.stringify({ width: 60 }) },
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

    // Check the jobs table for the persisted progress
    const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, clientJobId)).get();

    expect(job).toBeDefined();
    expect(job!.status).toBe("completed");
    expect(job!.progress).toBe(1); // 100% complete
    expect(job!.completedAt).not.toBeNull();
  });

  it("persists failed job status to the database", async () => {
    // Provide an invalid file (empty buffer won't be uploaded, so all fail)
    const clientJobId = randomUUID();

    const { body, contentType } = createMultipartPayload([
      {
        name: "file",
        filename: "bad.txt",
        contentType: "text/plain",
        content: Buffer.from("not an image"),
      },
      { name: "settings", content: JSON.stringify({ width: 50 }) },
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

    // Should fail (422 = all files failed)
    expect(res.statusCode).toBe(422);

    const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, clientJobId)).get();

    expect(job).toBeDefined();
    expect(job!.status).toBe("failed");
  });

  it("tracks progress for multi-file batch with partial success", async () => {
    const clientJobId = randomUUID();

    // Mix valid image + invalid data — partial success
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "good.png", contentType: "image/png", content: PNG },
      {
        name: "file",
        filename: "bad.txt",
        contentType: "text/plain",
        content: Buffer.from("not an image"),
      },
      { name: "settings", content: JSON.stringify({ width: 50 }) },
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

    // Should succeed (at least one file processed)
    expect(res.statusCode).toBe(200);

    const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, clientJobId)).get();

    expect(job).toBeDefined();
    expect(job!.status).toBe("completed");
    // Should have error info for the failed file
    if (job!.error) {
      const errors = JSON.parse(job!.error);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── Pipeline batch progress ─────────────────────────────────────
describe("Pipeline batch progress tracking", () => {
  it("tracks progress during pipeline batch execution", async () => {
    const clientJobId = randomUUID();

    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "pipe1.png", contentType: "image/png", content: PNG },
      { name: "file", filename: "pipe2.jpg", contentType: "image/jpeg", content: JPG },
      {
        name: "pipeline",
        content: JSON.stringify({
          steps: [{ toolId: "resize", settings: { width: 50 } }],
        }),
      },
      { name: "clientJobId", content: clientJobId },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pipeline/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-job-id"]).toBe(clientJobId);

    // Verify DB persistence
    const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, clientJobId)).get();

    expect(job).toBeDefined();
    expect(job!.status).toBe("completed");
  });

  it("pipeline batch generates job ID when not provided", async () => {
    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "auto.png", contentType: "image/png", content: PNG },
      {
        name: "pipeline",
        content: JSON.stringify({
          steps: [{ toolId: "rotate", settings: { angle: 90 } }],
        }),
      },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pipeline/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const jobId = res.headers["x-job-id"] as string;
    expect(jobId).toBeDefined();
    expect(jobId.length).toBeGreaterThan(0);
  });
});

// ── Job DB record structure ─────────────────────────────────────
describe("Job DB record structure", () => {
  it("persisted job contains expected fields", async () => {
    const clientJobId = randomUUID();

    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "fields.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify({ width: 70 }) },
      { name: "clientJobId", content: clientJobId },
    ]);

    await app.inject({
      method: "POST",
      url: "/api/v1/tools/resize/batch",
      headers: {
        "content-type": contentType,
        authorization: `Bearer ${adminToken}`,
      },
      body,
    });

    const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, clientJobId)).get();

    expect(job).toBeDefined();
    expect(job!.id).toBe(clientJobId);
    expect(job!.type).toBe("batch");
    expect(typeof job!.progress).toBe("number");
    expect(job!.progress).toBeGreaterThanOrEqual(0);
    expect(job!.progress).toBeLessThanOrEqual(1);
  });
});
