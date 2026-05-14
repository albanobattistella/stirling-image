import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../../apps/api/src/lib/svg-sanitize.js";

const FIXTURES_DIR = join(__dirname, "../fixtures/security");

function loadFixture(name: string): Buffer {
  return readFileSync(join(FIXTURES_DIR, name));
}

function sanitize(name: string): string {
  return sanitizeSvg(loadFixture(name)).toString("utf-8");
}

describe("SVG sanitizer -- attack payload fixtures", () => {
  it("strips <script> tags (svg-xss-script.svg)", () => {
    const result = sanitize("svg-xss-script.svg");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("</script>");
    expect(result).not.toContain("alert(1)");
    // SVG wrapper should survive
    expect(result).toContain("<svg");
  });

  it("neutralizes event handler attributes (svg-xss-event-handler.svg)", () => {
    const result = sanitize("svg-xss-event-handler.svg");
    expect(result).not.toMatch(/\bonload\s*=/i);
    // The event handler is replaced with data-removed="" (value stripped)
    expect(result).toContain('data-removed=""');
    // The payload text should not appear in any executable context
    expect(result).not.toMatch(/on\w+\s*=\s*["']alert/i);
  });

  it("removes DOCTYPE with XXE file-read entity (svg-xxe-file-read.svg)", () => {
    const result = sanitize("svg-xxe-file-read.svg");
    expect(result).not.toMatch(/<!DOCTYPE/i);
    expect(result).not.toContain("file:///etc/passwd");
  });

  it("removes DOCTYPE with XXE SSRF entity (svg-xxe-ssrf.svg)", () => {
    const result = sanitize("svg-xxe-ssrf.svg");
    expect(result).not.toMatch(/<!DOCTYPE/i);
    expect(result).not.toContain("169.254.169.254");
  });

  it("strips foreignObject and embedded script (svg-foreign-object.svg)", () => {
    const result = sanitize("svg-foreign-object.svg");
    expect(result).not.toContain("<foreignObject");
    expect(result).not.toContain("</foreignObject>");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert(1)");
  });

  it("blocks data: URI in href (svg-data-uri.svg)", () => {
    const result = sanitize("svg-data-uri.svg");
    // The data:text/html payload should be neutralized
    expect(result).not.toMatch(/href\s*=\s*["']data:text\/html/i);
    expect(result).not.toContain("<script>alert(1)</script>");
  });

  it("strips XInclude elements and namespace (svg-xinclude.svg)", () => {
    const result = sanitize("svg-xinclude.svg");
    expect(result).not.toContain("xi:include");
    expect(result).not.toContain("xmlns:xi");
    expect(result).not.toContain("file:///etc/passwd");
  });

  it("strips CDATA sections to prevent script bypass (svg-cdata-bypass.svg)", () => {
    const result = sanitize("svg-cdata-bypass.svg");
    expect(result).not.toContain("CDATA");
    expect(result).not.toContain("alert(document.cookie)");
    // Script tags should also be removed
    expect(result).not.toContain("<script");
  });

  it("decodes entity-encoded javascript: URI and blocks it (svg-entity-bypass.svg)", () => {
    const result = sanitize("svg-entity-bypass.svg");
    // After entity decoding, javascript: should be caught and neutralized
    expect(result).not.toMatch(/href\s*=\s*["']javascript:/i);
    // The javascript: scheme must be gone (replaced with safe data:, prefix)
    expect(result).not.toContain("javascript:");
  });

  it("strips <animate> elements that inject URIs (svg-animate-inject.svg)", () => {
    const result = sanitize("svg-animate-inject.svg");
    expect(result).not.toContain("<animate");
    expect(result).not.toContain("javascript:alert(1)");
  });

  it("strips <set> elements that inject attributes (svg-set-inject.svg)", () => {
    const result = sanitize("svg-set-inject.svg");
    expect(result).not.toContain("<set");
    expect(result).not.toContain("onmouseover");
  });
});

describe("SVG sanitizer -- clean SVGs pass through", () => {
  it("preserves a minimal clean SVG unchanged", () => {
    const clean = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(Buffer.from(clean)).toString("utf-8");
    expect(result).toBe(clean);
  });

  it("preserves internal CSS styles", () => {
    const clean =
      '<svg xmlns="http://www.w3.org/2000/svg"><style>rect { fill: red; }</style><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(Buffer.from(clean)).toString("utf-8");
    expect(result).toContain("<style>");
    expect(result).toContain("fill: red");
  });

  it("preserves internal fragment href in <use>", () => {
    const clean =
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><rect id="r" width="10" height="10"/></defs><use href="#r"/></svg>';
    const result = sanitizeSvg(Buffer.from(clean)).toString("utf-8");
    expect(result).toContain('href="#r"');
  });
});

describe("SVG sanitizer -- data: in url()", () => {
  it("blocks data: scheme inside url() property values", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill: url(data:image/svg+xml,<svg/>)"/></svg>';
    const result = sanitizeSvg(Buffer.from(svg)).toString("utf-8");
    expect(result).not.toMatch(/url\s*\(\s*["']?data:image/i);
  });
});

describe("SVG sanitizer -- <use> with external href", () => {
  it("removes <use> elements referencing external HTTP URLs", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.com/payload.svg#x"/></svg>';
    const result = sanitizeSvg(Buffer.from(svg)).toString("utf-8");
    expect(result).not.toContain("evil.com");
    expect(result).not.toContain("<use");
  });

  it("removes <use> elements referencing external xlink:href URLs", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="http://evil.com/payload.svg#x"/></svg>';
    const result = sanitizeSvg(Buffer.from(svg)).toString("utf-8");
    expect(result).not.toContain("<use");
  });

  it("preserves <use> with internal fragment reference", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><use href="#myShape"/></svg>';
    const result = sanitizeSvg(Buffer.from(svg)).toString("utf-8");
    expect(result).toContain("<use");
    expect(result).toContain('href="#myShape"');
  });
});

describe("SVG sanitizer -- iframe/embed stripping", () => {
  it("strips <iframe> elements", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><iframe src="https://evil.com"></iframe></svg>';
    const result = sanitizeSvg(Buffer.from(svg)).toString("utf-8");
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("evil.com");
  });

  it("strips <embed> elements", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><embed src="https://evil.com" type="text/html"/></svg>';
    const result = sanitizeSvg(Buffer.from(svg)).toString("utf-8");
    expect(result).not.toContain("<embed");
    expect(result).not.toContain("evil.com");
  });
});
