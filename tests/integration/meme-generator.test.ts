/**
 * Integration tests for the meme-generator tool (/api/v1/tools/meme-generator).
 *
 * Supports two input modes:
 * 1. Template mode: JSON body with templateId (no file upload)
 * 2. Custom image mode: multipart with file upload + settings
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, createMultipartPayload, loginAsAdmin, type TestApp } from "./test-server.js";

const FIXTURES = join(__dirname, "..", "fixtures");
const PNG = readFileSync(join(FIXTURES, "test-200x150.png"));

let testApp: TestApp;
let app: TestApp["app"];
let adminToken: string;

/** First template ID from the real manifest, loaded in beforeAll. */
let firstTemplateId: string;
/** Text box IDs for the first template. */
let firstTemplateTextBoxIds: string[];

beforeAll(async () => {
  testApp = await buildTestApp();
  app = testApp.app;
  adminToken = await loginAsAdmin(app);

  // Read the first template from the actual manifest
  const manifestRes = await app.inject({
    method: "GET",
    url: "/api/v1/meme-templates",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const manifest = JSON.parse(manifestRes.body);
  const firstTemplate = manifest.templates[0];
  firstTemplateId = firstTemplate.id;
  firstTemplateTextBoxIds = firstTemplate.textBoxes.map((tb: { id: string }) => tb.id);
}, 30_000);

afterAll(async () => {
  await testApp.cleanup();
}, 10_000);

describe("Meme Generator", () => {
  // ── Template listing sanity check ─────────────────────────────────

  it("GET /api/v1/meme-templates returns valid manifest", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/meme-templates",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const manifest = JSON.parse(res.body);
    expect(manifest.templates).toBeDefined();
    expect(manifest.templates.length).toBeGreaterThan(0);
    expect(manifest.templates[0].id).toBeDefined();
    expect(manifest.templates[0].textBoxes).toBeDefined();
  });

  // ── Template mode ─────────────────────────────────────────────────

  it("template mode: valid templateId + text boxes returns 200 with downloadUrl", async () => {
    const textBoxes = firstTemplateTextBoxIds.map((id) => ({
      id,
      text: `Test text for ${id}`,
    }));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/meme-generator",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      },
      payload: {
        templateId: firstTemplateId,
        textBoxes,
      },
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.downloadUrl).toBeDefined();
    expect(result.jobId).toBeDefined();
    expect(result.processedSize).toBeGreaterThan(0);
  });

  // ── Custom image mode ─────────────────────────────────────────────

  it("custom image mode: file upload + textLayout + text boxes returns 200", async () => {
    const settings = {
      textLayout: "top-bottom",
      textBoxes: [
        { id: "top", text: "TOP TEXT" },
        { id: "bottom", text: "BOTTOM TEXT" },
      ],
    };

    const { body, contentType } = createMultipartPayload([
      { name: "file", filename: "meme.png", contentType: "image/png", content: PNG },
      { name: "settings", content: JSON.stringify(settings) },
    ]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/meme-generator",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": contentType,
      },
      body,
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.downloadUrl).toBeDefined();
    expect(result.jobId).toBeDefined();
    expect(result.processedSize).toBeGreaterThan(0);
  });

  // ── Validation: invalid templateId ────────────────────────────────

  it("invalid templateId returns 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/meme-generator",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      },
      payload: {
        templateId: "nonexistent-template-that-does-not-exist",
        textBoxes: [{ id: "top", text: "Hello" }],
      },
    });

    expect(res.statusCode).toBe(400);
    const result = JSON.parse(res.body);
    expect(result.error).toMatch(/template/i);
  });

  // ── Validation: neither templateId nor file ───────────────────────

  it("neither templateId nor file returns 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/meme-generator",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      },
      payload: {
        textBoxes: [{ id: "top", text: "Hello" }],
      },
    });

    expect(res.statusCode).toBe(400);
    const result = JSON.parse(res.body);
    expect(result.error).toBeDefined();
  });

  // ── Empty text boxes still generates image ────────────────────────

  it("empty text boxes returns 200 (image without text)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/meme-generator",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
      },
      payload: {
        templateId: firstTemplateId,
        textBoxes: [],
      },
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.downloadUrl).toBeDefined();
    expect(result.processedSize).toBeGreaterThan(0);
  });

  // ── Every font family ─────────────────────────────────────────────

  const FONT_FAMILIES = [
    "anton",
    "arial-black",
    "comic-sans",
    "montserrat",
    "bebas-neue",
    "permanent-marker",
  ] as const;

  for (const font of FONT_FAMILIES) {
    it(`font family "${font}" returns 200`, async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/tools/meme-generator",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "content-type": "application/json",
        },
        payload: {
          templateId: firstTemplateId,
          fontFamily: font,
          textBoxes: firstTemplateTextBoxIds.map((id) => ({
            id,
            text: `Test with ${font}`,
          })),
        },
      });

      expect(res.statusCode).toBe(200);
      const result = JSON.parse(res.body);
      expect(result.downloadUrl).toBeDefined();
    });
  }

  // ── All text layout presets with custom image ─────────────────────

  const TEXT_LAYOUTS = ["top-bottom", "top-only", "bottom-only", "center", "side-by-side"] as const;

  for (const layout of TEXT_LAYOUTS) {
    it(`text layout "${layout}" with custom image returns 200`, async () => {
      // Build text boxes matching the layout preset IDs
      const textBoxMap: Record<string, { id: string; text: string }[]> = {
        "top-bottom": [
          { id: "top", text: "TOP" },
          { id: "bottom", text: "BOTTOM" },
        ],
        "top-only": [{ id: "top", text: "TOP ONLY" }],
        "bottom-only": [{ id: "bottom", text: "BOTTOM ONLY" }],
        center: [{ id: "center", text: "CENTER TEXT" }],
        "side-by-side": [
          { id: "left", text: "LEFT" },
          { id: "right", text: "RIGHT" },
        ],
      };

      const settings = {
        textLayout: layout,
        textBoxes: textBoxMap[layout],
      };

      const { body, contentType } = createMultipartPayload([
        { name: "file", filename: "meme.png", contentType: "image/png", content: PNG },
        { name: "settings", content: JSON.stringify(settings) },
      ]);

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/tools/meme-generator",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "content-type": contentType,
        },
        body,
      });

      expect(res.statusCode).toBe(200);
      const result = JSON.parse(res.body);
      expect(result.downloadUrl).toBeDefined();
      expect(result.processedSize).toBeGreaterThan(0);
    });
  }

  // ── Authentication ────────────────────────────────────────────────

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tools/meme-generator",
      headers: {
        "content-type": "application/json",
      },
      payload: {
        templateId: firstTemplateId,
        textBoxes: [],
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
