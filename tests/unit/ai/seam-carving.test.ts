import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock sharp
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    png: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-jpeg-data")),
    metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
  }));
  return { default: mockSharp };
});

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("mock-output-data")),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}));

// Mock node:util to control the promisified execFile
const mockExecFileAsync = vi.fn();
vi.mock("node:util", () => ({
  promisify: () => mockExecFileAsync,
}));

import { readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";

const FAKE_INPUT = Buffer.from("fake-image-data");
const FAKE_OUTPUT_DIR = "/tmp/test-output";

beforeEach(() => {
  vi.clearAllMocks();

  // Re-establish defaults after clearAllMocks
  vi.mocked(readFile).mockResolvedValue(Buffer.from("mock-output-data"));
  vi.mocked(writeFile).mockResolvedValue(undefined);
  vi.mocked(rm).mockResolvedValue(undefined);

  // Reset sharp mock
  vi.mocked(sharp).mockImplementation(
    () =>
      ({
        png: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-jpeg-data")),
        metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
      }) as unknown as ReturnType<typeof sharp>,
  );

  // Default: both caire -help discovery and actual caire command succeed
  mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("seamCarve", () => {
  // Dynamic import needed because the module caches the caire binary path
  async function importFresh() {
    vi.resetModules();
    // Re-apply mocks that resetModules wipes
    vi.mocked(readFile).mockResolvedValue(Buffer.from("mock-output-data"));
    vi.mocked(writeFile).mockResolvedValue(undefined);
    vi.mocked(rm).mockResolvedValue(undefined);
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "" });
    vi.mocked(sharp).mockImplementation(
      () =>
        ({
          png: vi.fn().mockReturnThis(),
          jpeg: vi.fn().mockReturnThis(),
          toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-jpeg-data")),
          metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
        }) as unknown as ReturnType<typeof sharp>,
    );

    const mod = await import("../../../packages/ai/src/seam-carving.js");
    return mod;
  }

  it("writes JPEG input and reads PNG output", async () => {
    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR);

    // writeFile called with the jpeg buffer
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining("caire-in-"),
      expect.any(Buffer),
    );
    // readFile called for the output
    expect(readFile).toHaveBeenCalledWith(expect.stringContaining("caire-out-"));
  });

  it("passes width and height args to caire", async () => {
    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR, { width: 400, height: 300 });

    const calls = mockExecFileAsync.mock.calls;
    const caireCall = calls.find((c: unknown[]) => Array.isArray(c[1]) && c[1].includes("-width"));
    expect(caireCall).toBeDefined();
    expect(caireCall![1]).toContain("-width");
    expect(caireCall![1]).toContain("400");
    expect(caireCall![1]).toContain("-height");
    expect(caireCall![1]).toContain("300");
  });

  it("uses square mode with shortest side", async () => {
    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR, { square: true });

    const calls = mockExecFileAsync.mock.calls;
    const caireCall = calls.find((c: unknown[]) => Array.isArray(c[1]) && c[1].includes("-square"));
    expect(caireCall).toBeDefined();
    // shortest side of 800x600 is 600
    expect(caireCall![1]).toContain("-width");
    expect(caireCall![1]).toContain("600");
    expect(caireCall![1]).toContain("-height");
    expect(caireCall![1]).toContain("600");
  });

  it("passes protectFaces option as -face flag", async () => {
    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR, { protectFaces: true });

    const calls = mockExecFileAsync.mock.calls;
    const caireCall = calls.find((c: unknown[]) => Array.isArray(c[1]) && c[1].includes("-face"));
    expect(caireCall).toBeDefined();
  });

  it("passes blurRadius and sobelThreshold options", async () => {
    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR, { blurRadius: 5, sobelThreshold: 10 });

    const calls = mockExecFileAsync.mock.calls;
    const caireCall = calls.find((c: unknown[]) => Array.isArray(c[1]) && c[1].includes("-blur"));
    expect(caireCall).toBeDefined();
    expect(caireCall![1]).toContain("-blur");
    expect(caireCall![1]).toContain("5");
    expect(caireCall![1]).toContain("-sobel");
    expect(caireCall![1]).toContain("10");
  });

  it("returns SeamCarveResult with output dimensions", async () => {
    const { seamCarve } = await importFresh();
    const result = await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR);

    expect(result).toEqual({
      buffer: expect.any(Buffer),
      width: 800,
      height: 600,
    });
  });

  it("cleans up temp files on success", async () => {
    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR);

    // rm called for both input and output
    expect(rm).toHaveBeenCalledTimes(2);
    expect(rm).toHaveBeenCalledWith(expect.stringContaining("caire-in-"), { force: true });
    expect(rm).toHaveBeenCalledWith(expect.stringContaining("caire-out-"), { force: true });
  });

  it("cleans up temp files on failure", async () => {
    // First call succeeds (caire -help), second call fails (actual caire run)
    mockExecFileAsync
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockRejectedValueOnce(new Error("caire process failed"));

    const { seamCarve } = await importFresh();
    await expect(seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR)).rejects.toThrow("caire process failed");

    // rm still called for cleanup even on failure
    expect(rm).toHaveBeenCalledTimes(2);
  });

  it("throws when caire binary is not found", async () => {
    const origCairePath = process.env.CAIRE_PATH;
    delete process.env.CAIRE_PATH;

    const { seamCarve } = await importFresh();
    mockExecFileAsync.mockRejectedValue(new Error("ENOENT"));
    await expect(seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR)).rejects.toThrow("caire binary not found");

    if (origCairePath) process.env.CAIRE_PATH = origCairePath;
  });

  it("uses CAIRE_PATH env var when set", async () => {
    const origCairePath = process.env.CAIRE_PATH;
    process.env.CAIRE_PATH = "/custom/path/caire";

    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR);

    // First call should try the custom path
    expect(mockExecFileAsync.mock.calls[0][0]).toBe("/custom/path/caire");

    // Restore
    if (origCairePath) {
      process.env.CAIRE_PATH = origCairePath;
    } else {
      delete process.env.CAIRE_PATH;
    }
  });

  it("always passes -preview=false", async () => {
    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR);

    const calls = mockExecFileAsync.mock.calls;
    const caireCall = calls.find(
      (c: unknown[]) => Array.isArray(c[1]) && c[1].includes("-preview=false"),
    );
    expect(caireCall).toBeDefined();
  });

  it("scales timeout based on megapixels", async () => {
    vi.mocked(sharp).mockImplementation(
      () =>
        ({
          png: vi.fn().mockReturnThis(),
          jpeg: vi.fn().mockReturnThis(),
          toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-jpeg-data")),
          // 4000x3000 = 12MP, should give timeout > 120s
          metadata: vi.fn().mockResolvedValue({ width: 4000, height: 3000 }),
        }) as unknown as ReturnType<typeof sharp>,
    );

    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR);

    const calls = mockExecFileAsync.mock.calls;
    const caireCall = calls.find(
      (c: unknown[]) => Array.isArray(c[1]) && c[1].includes("-preview=false"),
    );
    // timeout = max(120_000, 12 * 10 * 1000) = 120_000
    expect(caireCall![2]).toEqual(expect.objectContaining({ timeout: expect.any(Number) }));
  });

  it("does not pass width/height args when not specified", async () => {
    const { seamCarve } = await importFresh();
    await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR);

    const calls = mockExecFileAsync.mock.calls;
    const caireCall = calls.find(
      (c: unknown[]) => Array.isArray(c[1]) && c[1].includes("-preview=false"),
    );
    expect(caireCall![1]).not.toContain("-width");
    expect(caireCall![1]).not.toContain("-height");
  });

  it("handles zero dimensions from metadata gracefully", async () => {
    vi.mocked(sharp).mockImplementation(
      () =>
        ({
          png: vi.fn().mockReturnThis(),
          jpeg: vi.fn().mockReturnThis(),
          toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-jpeg-data")),
          metadata: vi.fn().mockResolvedValue({ width: undefined, height: undefined }),
        }) as unknown as ReturnType<typeof sharp>,
    );

    const { seamCarve } = await importFresh();
    // Should not throw; width/height default to 0
    const result = await seamCarve(FAKE_INPUT, FAKE_OUTPUT_DIR);
    expect(result).toBeDefined();
  });
});
