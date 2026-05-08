import { describe, expect, it } from "vitest";
import {
  autoSizeFontToFit,
  loadFont,
  measureText,
  renderMemeTextSvg,
  wrapText,
} from "../../../apps/api/src/lib/meme-text-renderer.js";

// ==========================================================================
// loadFont
// ==========================================================================

describe("loadFont", () => {
  it("loads anton font", () => {
    const font = loadFont("anton");
    expect(font).toBeDefined();
    expect(font.getAdvanceWidth).toBeTypeOf("function");
  });

  it("falls back to anton for unknown fonts", () => {
    const font = loadFont("totally-unknown-font");
    const anton = loadFont("anton");
    // Both should return a usable font object
    expect(font).toBeDefined();
    expect(font.getAdvanceWidth("Hello", 48)).toBe(anton.getAdvanceWidth("Hello", 48));
  });

  it("caches across calls", () => {
    const first = loadFont("anton");
    const second = loadFont("anton");
    expect(first).toBe(second);
  });
});

// ==========================================================================
// measureText
// ==========================================================================

describe("measureText", () => {
  it("returns positive width for non-empty text", () => {
    const width = measureText("Hello", "anton", 48);
    expect(width).toBeGreaterThan(0);
  });

  it("returns 0 for empty text", () => {
    const width = measureText("", "anton", 48);
    expect(width).toBe(0);
  });

  it("scales with font size", () => {
    const small = measureText("Hello", "anton", 24);
    const large = measureText("Hello", "anton", 48);
    expect(large).toBeGreaterThan(small);
  });
});

// ==========================================================================
// wrapText
// ==========================================================================

describe("wrapText", () => {
  it("returns single line when text fits", () => {
    const lines = wrapText("Hi", "anton", 48, 500);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("Hi");
  });

  it("wraps into multiple lines", () => {
    const lines = wrapText("This is a longer sentence that should wrap", "anton", 48, 200);
    expect(lines.length).toBeGreaterThan(1);
  });

  it("handles single word exceeding width", () => {
    const lines = wrapText("Supercalifragilisticexpialidocious", "anton", 48, 50);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    // The word must appear somewhere in the output
    expect(lines.join("")).toBe("Supercalifragilisticexpialidocious");
  });

  it('returns [""] for empty text', () => {
    const lines = wrapText("", "anton", 48, 500);
    expect(lines).toEqual([""]);
  });

  it("handles multiple spaces", () => {
    const lines = wrapText("Hello   World", "anton", 48, 500);
    // Should still produce valid output (no empty-string tokens)
    for (const line of lines) {
      expect(line.trim()).not.toBe("");
    }
  });
});

// ==========================================================================
// autoSizeFontToFit
// ==========================================================================

describe("autoSizeFontToFit", () => {
  it("returns size within bounds", () => {
    const size = autoSizeFontToFit("Hello World", "anton", 400, 200);
    expect(size).toBeGreaterThanOrEqual(8);
    expect(size).toBeLessThanOrEqual(200);
  });

  it("returns smaller size for longer text", () => {
    const shortSize = autoSizeFontToFit("Hi", "anton", 400, 200);
    const longSize = autoSizeFontToFit(
      "This is a much longer piece of text that needs more space",
      "anton",
      400,
      200,
    );
    expect(longSize).toBeLessThanOrEqual(shortSize);
  });

  it("returns min size for tiny box", () => {
    const size = autoSizeFontToFit("Hello World", "anton", 10, 10);
    expect(size).toBe(8);
  });

  it("respects maxFontSize", () => {
    const size = autoSizeFontToFit("Hi", "anton", 2000, 2000, 36);
    expect(size).toBeLessThanOrEqual(36);
  });
});

// ==========================================================================
// renderMemeTextSvg
// ==========================================================================

describe("renderMemeTextSvg", () => {
  it("returns valid SVG with <path> elements", () => {
    const svgBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [{ text: "TOP TEXT", x: 5, y: 2, width: 90, height: 20 }],
      fontFamily: "anton",
      textColor: "#ffffff",
      strokeColor: "#000000",
      textAlign: "center",
      allCaps: false,
    });
    const svg = svgBuf.toString("utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
    expect(svg).toContain("</svg>");
  });

  it("has correct fill/stroke attributes", () => {
    const svgBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [{ text: "Hello", x: 5, y: 2, width: 90, height: 20 }],
      fontFamily: "anton",
      textColor: "#ff0000",
      strokeColor: "#00ff00",
      textAlign: "center",
      allCaps: false,
    });
    const svg = svgBuf.toString("utf-8");
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('stroke="#00ff00"');
  });

  it('has paint-order="stroke fill"', () => {
    const svgBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [{ text: "Hello", x: 5, y: 2, width: 90, height: 20 }],
      fontFamily: "anton",
      textColor: "#ffffff",
      strokeColor: "#000000",
      textAlign: "center",
      allCaps: false,
    });
    const svg = svgBuf.toString("utf-8");
    expect(svg).toContain('paint-order="stroke fill"');
  });

  it("skips empty text boxes", () => {
    const svgBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [
        { text: "", x: 5, y: 2, width: 90, height: 20 },
        { text: "   ", x: 5, y: 50, width: 90, height: 20 },
      ],
      fontFamily: "anton",
      textColor: "#ffffff",
      strokeColor: "#000000",
      textAlign: "center",
      allCaps: false,
    });
    const svg = svgBuf.toString("utf-8");
    // SVG is returned but should have no <path> elements
    expect(svg).not.toContain("<path");
  });

  it("applies allCaps", () => {
    const lowerBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [{ text: "hello", x: 5, y: 2, width: 90, height: 20 }],
      fontFamily: "anton",
      textColor: "#ffffff",
      strokeColor: "#000000",
      textAlign: "center",
      allCaps: false,
    });
    const upperBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [{ text: "hello", x: 5, y: 2, width: 90, height: 20 }],
      fontFamily: "anton",
      textColor: "#ffffff",
      strokeColor: "#000000",
      textAlign: "center",
      allCaps: true,
    });
    // Different path data when allCaps transforms the text
    const lowerSvg = lowerBuf.toString("utf-8");
    const upperSvg = upperBuf.toString("utf-8");
    expect(lowerSvg).not.toBe(upperSvg);
  });

  it("uses custom fontSize", () => {
    const svgBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [{ text: "Hello", x: 5, y: 2, width: 90, height: 20 }],
      fontFamily: "anton",
      fontSize: 32,
      textColor: "#ffffff",
      strokeColor: "#000000",
      textAlign: "center",
      allCaps: false,
    });
    const svg = svgBuf.toString("utf-8");
    expect(svg).toContain("<path");
  });

  it("renders differently with different fonts", () => {
    const antonBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [{ text: "Hello", x: 5, y: 2, width: 90, height: 20 }],
      fontFamily: "anton",
      fontSize: 48,
      textColor: "#ffffff",
      strokeColor: "#000000",
      textAlign: "center",
      allCaps: false,
    });
    const bebasBuf = renderMemeTextSvg({
      imageWidth: 800,
      imageHeight: 600,
      textBoxes: [{ text: "Hello", x: 5, y: 2, width: 90, height: 20 }],
      fontFamily: "bebas-neue",
      fontSize: 48,
      textColor: "#ffffff",
      strokeColor: "#000000",
      textAlign: "center",
      allCaps: false,
    });
    expect(antonBuf.toString("utf-8")).not.toBe(bebasBuf.toString("utf-8"));
  });
});
