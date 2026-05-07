const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  tiff: "image/tiff",
  tif: "image/tiff",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  heif: "image/heif",
  heic: "image/heic",
  jxl: "image/jxl",
  dng: "image/x-adobe-dng",
  cr2: "image/x-canon-cr2",
  nef: "image/x-nikon-nef",
  arw: "image/x-sony-arw",
  orf: "image/x-olympus-orf",
  rw2: "image/x-panasonic-rw2",
  cr3: "image/x-canon-cr3",
  raf: "image/x-fuji-raf",
  pef: "image/x-pentax-pef",
  "3fr": "image/x-hasselblad-3fr",
  iiq: "image/x-phaseone-iiq",
  srw: "image/x-samsung-srw",
  x3f: "image/x-sigma-x3f",
  rwl: "image/x-leica-rwl",
  nrw: "image/x-nikon-nrw",
  gpr: "image/x-gopro-gpr",
  fff: "image/x-hasselblad-fff",
  mrw: "image/x-minolta-mrw",
  mef: "image/x-mamiya-mef",
  kdc: "image/x-kodak-kdc",
  dcr: "image/x-kodak-dcr",
  erf: "image/x-epson-erf",
  ptx: "image/x-pentax-ptx",
  tga: "image/x-tga",
  psd: "image/vnd.adobe.photoshop",
  exr: "image/x-exr",
  hdr: "image/vnd.radiance",
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/tiff": "tiff",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/heif": "heif",
  "image/heic": "heic",
  "image/jxl": "jxl",
  "image/x-adobe-dng": "dng",
  "image/x-canon-cr2": "cr2",
  "image/x-nikon-nef": "nef",
  "image/x-sony-arw": "arw",
  "image/x-olympus-orf": "orf",
  "image/x-panasonic-rw2": "rw2",
  "image/x-canon-cr3": "cr3",
  "image/x-fuji-raf": "raf",
  "image/x-pentax-pef": "pef",
  "image/x-hasselblad-3fr": "3fr",
  "image/x-phaseone-iiq": "iiq",
  "image/x-samsung-srw": "srw",
  "image/x-sigma-x3f": "x3f",
  "image/x-leica-rwl": "rwl",
  "image/x-nikon-nrw": "nrw",
  "image/x-gopro-gpr": "gpr",
  "image/x-hasselblad-fff": "fff",
  "image/x-minolta-mrw": "mrw",
  "image/x-mamiya-mef": "mef",
  "image/x-kodak-kdc": "kdc",
  "image/x-kodak-dcr": "dcr",
  "image/x-epson-erf": "erf",
  "image/x-pentax-ptx": "ptx",
  "image/x-tga": "tga",
  "image/vnd.adobe.photoshop": "psd",
  "image/x-exr": "exr",
  "image/vnd.radiance": "hdr",
};

/**
 * Get the MIME type for a file extension (without dot).
 */
export function extToMime(ext: string): string {
  const normalized = ext.toLowerCase().replace(/^\./, "");
  return EXT_TO_MIME[normalized] ?? "application/octet-stream";
}

/**
 * Get the file extension for a MIME type (without dot).
 */
export function mimeToExt(mime: string): string {
  const normalized = mime.toLowerCase();
  return MIME_TO_EXT[normalized] ?? "bin";
}

/**
 * Get the MIME type for a Sharp format string.
 */
export function formatToMime(format: string): string {
  const normalized = format.toLowerCase();
  if (normalized === "jpeg") return "image/jpeg";
  return EXT_TO_MIME[normalized] ?? "application/octet-stream";
}

/**
 * Get the file extension for a Sharp format string.
 */
export function formatToExt(format: string): string {
  const normalized = format.toLowerCase();
  if (normalized === "jpeg") return "jpg";
  return normalized;
}
