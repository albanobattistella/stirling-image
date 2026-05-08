import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../apps/api/static/meme-templates");
const MANIFEST_PATH = join(TEMPLATES_DIR, "meme-templates.json");
const FULL_DIR = join(TEMPLATES_DIR, "full");

interface ImgflipMeme {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count: number;
}

async function fetchImgflipMemes(): Promise<ImgflipMeme[]> {
  const res = await fetch("https://api.imgflip.com/get_memes");
  const data = (await res.json()) as {
    success: boolean;
    data: { memes: ImgflipMeme[] };
  };
  if (!data.success) throw new Error("Imgflip API failed");
  return data.data.memes;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function downloadImage(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const resized = await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  writeFileSync(dest, resized);
}

async function main() {
  mkdirSync(FULL_DIR, { recursive: true });

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const existingIds = new Set(manifest.templates.map((t: { id: string }) => t.id));

  const imgflipMemes = await fetchImgflipMemes();
  console.log(`Imgflip returned ${imgflipMemes.length} memes`);

  let downloaded = 0;
  for (const meme of imgflipMemes) {
    const slug = slugify(meme.name);
    const filename = `${slug}.jpg`;
    const destPath = join(FULL_DIR, filename);

    if (existsSync(destPath)) {
      console.log(`  SKIP ${slug} (already exists)`);
      continue;
    }

    if (existingIds.has(slug)) {
      console.log(`  DOWNLOAD ${slug}`);
      await downloadImage(meme.url, destPath);
      downloaded++;
    } else {
      console.log(`  SKIP ${slug} (not in manifest)`);
    }
  }

  console.log(`Downloaded ${downloaded} template images`);
}

main().catch(console.error);
