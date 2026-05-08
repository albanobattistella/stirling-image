import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../apps/api/static/meme-templates");
const FULL_DIR = join(TEMPLATES_DIR, "full");
const THUMBS_DIR = join(TEMPLATES_DIR, "thumbs");

async function main() {
  mkdirSync(THUMBS_DIR, { recursive: true });

  const files = readdirSync(FULL_DIR).filter(
    (f) => f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"),
  );

  console.log(`Generating thumbnails for ${files.length} templates...`);

  for (const file of files) {
    const { name } = parse(file);
    const inputPath = join(FULL_DIR, file);
    const outputPath = join(THUMBS_DIR, `${name}.webp`);

    await sharp(inputPath).resize({ width: 200 }).webp({ quality: 80 }).toFile(outputPath);

    console.log(`  ${name}.webp`);
  }

  console.log("Done.");
}

main().catch(console.error);
