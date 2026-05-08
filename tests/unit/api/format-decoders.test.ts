import { describe, expect, it } from "vitest";
import { decodeToSharpCompat, needsCliDecode } from "../../../apps/api/src/lib/format-decoders.js";

// ==========================================================================
// needsCliDecode
// ==========================================================================

describe("needsCliDecode", () => {
  it("returns true for raw format", () => {
    expect(needsCliDecode("raw")).toBe(true);
  });

  it("returns true for ico format", () => {
    expect(needsCliDecode("ico")).toBe(true);
  });

  it("returns true for tga format", () => {
    expect(needsCliDecode("tga")).toBe(true);
  });

  it("returns true for psd format", () => {
    expect(needsCliDecode("psd")).toBe(true);
  });

  it("returns true for exr format", () => {
    expect(needsCliDecode("exr")).toBe(true);
  });

  it("returns true for hdr format", () => {
    expect(needsCliDecode("hdr")).toBe(true);
  });

  it("returns false for jpeg format", () => {
    expect(needsCliDecode("jpeg")).toBe(false);
  });

  it("returns false for png format", () => {
    expect(needsCliDecode("png")).toBe(false);
  });

  it("returns false for webp format", () => {
    expect(needsCliDecode("webp")).toBe(false);
  });

  it("returns false for gif format", () => {
    expect(needsCliDecode("gif")).toBe(false);
  });

  it("returns false for avif format", () => {
    expect(needsCliDecode("avif")).toBe(false);
  });

  it("returns false for svg format", () => {
    expect(needsCliDecode("svg")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(needsCliDecode("")).toBe(false);
  });

  it("returns true for bmp format", () => {
    expect(needsCliDecode("bmp")).toBe(true);
  });

  it("returns true for jxl format", () => {
    expect(needsCliDecode("jxl")).toBe(true);
  });

  it("returns false for unknown format", () => {
    expect(needsCliDecode("xyz")).toBe(false);
  });

  it("returns true for jp2 format", () => {
    expect(needsCliDecode("jp2")).toBe(true);
  });
  it("returns true for eps format", () => {
    expect(needsCliDecode("eps")).toBe(true);
  });
  it("returns true for dds format", () => {
    expect(needsCliDecode("dds")).toBe(true);
  });
  it("returns true for cur format", () => {
    expect(needsCliDecode("cur")).toBe(true);
  });
  it("returns true for dpx format", () => {
    expect(needsCliDecode("dpx")).toBe(true);
  });
  it("returns true for fits format", () => {
    expect(needsCliDecode("fits")).toBe(true);
  });
  it("returns true for qoi format", () => {
    expect(needsCliDecode("qoi")).toBe(true);
  });
  it("returns true for ppm format", () => {
    expect(needsCliDecode("ppm")).toBe(true);
  });
  it("returns true for pgm format", () => {
    expect(needsCliDecode("pgm")).toBe(true);
  });
  it("returns true for pbm format", () => {
    expect(needsCliDecode("pbm")).toBe(true);
  });
});

describe("decodeToSharpCompat", () => {
  it("returns buffer unchanged for unknown/native formats", async () => {
    const buf = Buffer.from("test data");
    const result = await decodeToSharpCompat(buf, "jpeg");
    expect(result).toBe(buf);
  });

  it("returns buffer unchanged for png format", async () => {
    const buf = Buffer.from("png data");
    const result = await decodeToSharpCompat(buf, "png");
    expect(result).toBe(buf);
  });

  it("returns buffer unchanged for empty format string", async () => {
    const buf = Buffer.from("some bytes");
    const result = await decodeToSharpCompat(buf, "");
    expect(result).toBe(buf);
  });

  it("returns buffer unchanged for webp format", async () => {
    const buf = Buffer.from("webp");
    const result = await decodeToSharpCompat(buf, "webp");
    expect(result).toBe(buf);
  });
});
