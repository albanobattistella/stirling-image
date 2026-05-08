import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMPOSITIONS = [
  { id: "PrivacyPromise", slug: "privacy-promise", posterFrame: 140 },
  { id: "ToolGalaxy", slug: "tool-galaxy", posterFrame: 450 },
  { id: "OneCommand", slug: "one-command", posterFrame: 300 },
  { id: "AiMagicReel", slug: "ai-magic-reel", posterFrame: 190 },
  { id: "FormatUniverse", slug: "format-universe", posterFrame: 90 },
  { id: "PipelineFlow", slug: "pipeline-flow", posterFrame: 260 },
  { id: "FloatingTools", slug: "floating-tools", posterFrame: 60 },
  { id: "BrandGradient", slug: "brand-gradient", posterFrame: 0 },
  { id: "The48", slug: "the-48", posterFrame: 420 },
  { id: "CloudVsLocal", slug: "cloud-vs-local", posterFrame: 380 },
];

const OUTPUT_DIR = path.resolve(__dirname, "../../landing/public/videos");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log("Bundling Remotion project...");
const bundleLocation = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => {
    const tailwindConfig = enableTailwind(config);
    return {
      ...tailwindConfig,
      resolve: {
        ...tailwindConfig.resolve,
        alias: {
          ...tailwindConfig.resolve?.alias,
          "@": path.resolve(__dirname, "../src"),
        },
      },
    };
  },
});
console.log("Bundle complete.\n");

const total = COMPOSITIONS.length;

for (let i = 0; i < total; i++) {
  const comp = COMPOSITIONS[i];
  console.log(`[${i + 1}/${total}] ${comp.id}`);

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: comp.id,
  });

  // MP4 (H.264, CRF 22)
  console.log("  Rendering MP4 (H.264)...");
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    crf: 22,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    concurrency: 4,
    outputLocation: path.join(OUTPUT_DIR, `${comp.slug}.mp4`),
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`\r  MP4: ${pct}%`);
    },
  });
  console.log(`\r  MP4: done`);

  // WebM (VP9, CRF 31)
  console.log("  Rendering WebM (VP9)...");
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "vp9",
    crf: 31,
    imageFormat: "jpeg",
    concurrency: 4,
    outputLocation: path.join(OUTPUT_DIR, `${comp.slug}.webm`),
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 10 === 0) process.stdout.write(`\r  WebM: ${pct}%`);
    },
  });
  console.log(`\r  WebM: done`);

  // Poster frame (WebP still)
  console.log("  Rendering poster frame...");
  await renderStill({
    composition,
    serveUrl: bundleLocation,
    frame: comp.posterFrame,
    imageFormat: "webp",
    output: path.join(OUTPUT_DIR, `${comp.slug}-poster.webp`),
  });
  console.log("  Poster: done\n");
}

console.log(
  `All ${total} compositions rendered (MP4 + WebM + poster) to ${OUTPUT_DIR}`,
);
