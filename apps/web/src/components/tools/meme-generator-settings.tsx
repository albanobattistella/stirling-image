import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Download,
  ImagePlus,
  Laugh,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatHeaders } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────

interface TemplateTextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultText?: string;
}

interface MemeTemplate {
  id: string;
  name: string;
  aliases: string[];
  tags: string[];
  category: string;
  filename: string;
  width: number;
  height: number;
  popularity: number;
  textBoxes: TemplateTextBox[];
}

interface TemplateManifest {
  version: number;
  categories: string[];
  templates: MemeTemplate[];
}

type Phase = "gallery" | "layout-picker" | "editor" | "result";
type TextLayout = "top-bottom" | "top-only" | "bottom-only" | "center" | "side-by-side";

interface TextBoxValue {
  id: string;
  text: string;
}

// ── Constants ────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { value: "anton", label: "Anton" },
  { value: "arial-black", label: "Arial Black" },
  { value: "comic-sans", label: "Comic Sans" },
  { value: "montserrat", label: "Montserrat" },
  { value: "bebas-neue", label: "Bebas Neue" },
  { value: "permanent-marker", label: "Permanent Marker" },
  { value: "roboto", label: "Roboto Black" },
] as const;

const FONT_FAMILY_MAP: Record<string, string> = {
  anton: "'Anton', 'Impact', sans-serif",
  "arial-black": "'Arial Black', 'Anton', sans-serif",
  "comic-sans": "'Comic Sans MS', cursive",
  montserrat: "'Montserrat Black', 'Anton', sans-serif",
  "bebas-neue": "'Bebas Neue', 'Anton', sans-serif",
  "permanent-marker": "'Permanent Marker', cursive",
  roboto: "'Roboto Black', 'Anton', sans-serif",
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "reaction", label: "Reaction" },
  { id: "comparison", label: "Comparison" },
  { id: "opinion", label: "Opinion" },
  { id: "animals", label: "Animals" },
  { id: "classic", label: "Classic" },
];

const PRESET_LAYOUTS: Record<
  TextLayout,
  { label: string; description: string; boxes: TemplateTextBox[] }
> = {
  "top-bottom": {
    label: "Top + Bottom",
    description: "Classic meme layout",
    boxes: [
      { id: "top", x: 5, y: 2, width: 90, height: 20, defaultText: "Top text" },
      { id: "bottom", x: 5, y: 78, width: 90, height: 20, defaultText: "Bottom text" },
    ],
  },
  "top-only": {
    label: "Top Only",
    description: "Text at the top",
    boxes: [{ id: "top", x: 5, y: 2, width: 90, height: 25, defaultText: "Top text" }],
  },
  "bottom-only": {
    label: "Bottom Only",
    description: "Text at the bottom",
    boxes: [{ id: "bottom", x: 5, y: 75, width: 90, height: 23, defaultText: "Bottom text" }],
  },
  center: {
    label: "Center",
    description: "Text in the middle",
    boxes: [{ id: "center", x: 10, y: 35, width: 80, height: 30, defaultText: "Center text" }],
  },
  "side-by-side": {
    label: "Side by Side",
    description: "Left and right text",
    boxes: [
      { id: "left", x: 2, y: 35, width: 46, height: 30, defaultText: "Left text" },
      { id: "right", x: 52, y: 35, width: 46, height: 30, defaultText: "Right text" },
    ],
  },
};

const INPUT_CLASS =
  "w-full px-2 py-1.5 rounded border border-border bg-background text-sm text-foreground";

// ── Font loading ─────────────────────────────────────────────────────

const FONT_FACES = [
  { family: "Anton", file: "Anton-Regular.ttf" },
  { family: "Bebas Neue", file: "BebasNeue-Regular.ttf" },
  { family: "Permanent Marker", file: "PermanentMarker-Regular.ttf" },
  { family: "Montserrat Black", file: "Montserrat-Black.ttf" },
  { family: "Roboto Black", file: "Roboto-Black.ttf" },
];

function useFontLoader() {
  useEffect(() => {
    const id = "meme-generator-fonts";
    if (document.getElementById(id)) return;

    const css = FONT_FACES.map(
      (f) =>
        `@font-face { font-family: '${f.family}'; src: url('/api/v1/meme-templates/fonts/${f.file}') format('truetype'); font-display: swap; }`,
    ).join("\n");

    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);
}

// ── Subcomponents ────────────────────────────────────────────────────

function TextPreviewOverlay({
  boxes,
  textValues,
  fontFamily,
  fontSize,
  textColor,
  strokeColor,
  textAlign,
  allCaps,
}: {
  boxes: TemplateTextBox[];
  textValues: TextBoxValue[];
  fontFamily: string;
  fontSize: number;
  textColor: string;
  strokeColor: string;
  textAlign: string;
  allCaps: boolean;
}) {
  const cssFontFamily = FONT_FAMILY_MAP[fontFamily] ?? FONT_FAMILY_MAP.anton;

  return (
    <>
      {boxes.map((box) => {
        const value = textValues.find((v) => v.id === box.id);
        const text = value?.text || box.defaultText || "";
        const displayText = allCaps ? text.toUpperCase() : text;
        // Auto-size: scale from box height, or use explicit fontSize
        const autoSize = `clamp(12px, ${box.height * 0.6}cqi, 72px)`;
        const appliedSize = fontSize > 0 ? `${fontSize}px` : autoSize;

        return (
          <div
            key={box.id}
            data-testid={`preview-box-${box.id}`}
            className="absolute flex items-center overflow-hidden pointer-events-none"
            style={{
              top: `${box.y}%`,
              left: `${box.x}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
              justifyContent:
                textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center",
            }}
          >
            <span
              className="w-full leading-tight break-words whitespace-pre-wrap"
              style={{
                fontFamily: cssFontFamily,
                fontSize: appliedSize,
                color: textColor,
                textAlign: textAlign as "left" | "center" | "right",
                WebkitTextStroke: `2px ${strokeColor}`,
                textShadow: [
                  `2px 2px 0 ${strokeColor}`,
                  `-2px -2px 0 ${strokeColor}`,
                  `2px -2px 0 ${strokeColor}`,
                  `-2px 2px 0 ${strokeColor}`,
                  `0 2px 0 ${strokeColor}`,
                  `0 -2px 0 ${strokeColor}`,
                  `2px 0 0 ${strokeColor}`,
                  `-2px 0 0 ${strokeColor}`,
                ].join(", "),
              }}
            >
              {displayText}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Gallery Phase ────────────────────────────────────────────────────

function TemplateGallery({
  templates,
  onSelect,
  onUploadCustom,
}: {
  templates: MemeTemplate[];
  onSelect: (t: MemeTemplate) => void;
  onUploadCustom: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    let result = templates;

    if (category !== "all") {
      result = result.filter((t) => t.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.aliases.some((a) => a.toLowerCase().includes(q)) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [templates, search, category]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    for (const t of templates) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return counts;
  }, [templates]);

  return (
    <div data-testid="meme-gallery" className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          data-testid="template-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className={cn(INPUT_CLASS, "pl-8")}
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-testid={`category-${cat.id}`}
            onClick={() => setCategory(cat.id)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs transition-colors",
              category === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {cat.label}
            <span className="ml-1 opacity-70">({categoryCounts[cat.id] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Upload custom */}
      <button
        type="button"
        data-testid="upload-custom"
        onClick={onUploadCustom}
        className="w-full py-3 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <ImagePlus className="h-4 w-4" />
        Upload Custom Image
      </button>

      {/* Template grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filtered.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={`template-${t.id}`}
            onClick={() => onSelect(t)}
            className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/60 transition-all hover:shadow-md"
          >
            <img
              src={`/api/v1/meme-templates/thumbs/${t.filename}`}
              alt={t.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
              <span className="text-[10px] text-white font-medium leading-tight line-clamp-2">
                {t.name}
              </span>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Laugh className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No templates match your search
        </div>
      )}
    </div>
  );
}

// ── Layout Picker (custom image) ─────────────────────────────────────

function LayoutPicker({
  customImageUrl,
  onSelect,
  onBack,
}: {
  customImageUrl: string;
  onSelect: (layout: TextLayout) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<TextLayout>("top-bottom");

  return (
    <div data-testid="layout-picker" className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to templates
      </button>

      <p className="text-sm text-foreground font-medium">Choose a text layout</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(
          Object.entries(PRESET_LAYOUTS) as [TextLayout, (typeof PRESET_LAYOUTS)[TextLayout]][]
        ).map(([key, layout]) => (
          <button
            key={key}
            type="button"
            data-testid={`layout-${key}`}
            onClick={() => setSelected(key)}
            className={cn(
              "relative rounded-lg border-2 p-3 transition-all text-left",
              selected === key
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40",
            )}
          >
            {/* Mini preview */}
            <div className="relative aspect-video rounded bg-muted/50 overflow-hidden mb-2">
              <img src={customImageUrl} alt="" className="w-full h-full object-cover opacity-50" />
              {layout.boxes.map((box) => (
                <div
                  key={box.id}
                  className="absolute bg-primary/30 border border-primary/50 rounded-sm"
                  style={{
                    top: `${box.y}%`,
                    left: `${box.x}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-foreground">{layout.label}</span>
            <span className="block text-[10px] text-muted-foreground">{layout.description}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        data-testid="confirm-layout"
        onClick={() => onSelect(selected)}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2"
      >
        Continue
      </button>
    </div>
  );
}

// ── Editor Phase ─────────────────────────────────────────────────────

interface EditorSettings {
  textValues: TextBoxValue[];
  fontFamily: string;
  fontSize: number;
  textColor: string;
  strokeColor: string;
  textAlign: string;
  allCaps: boolean;
}

function MemeEditor({
  imageSrc,
  textBoxes,
  initialSettings,
  onBack,
  onGenerate,
}: {
  imageSrc: string;
  textBoxes: TemplateTextBox[];
  initialSettings: EditorSettings | null;
  onBack: () => void;
  onGenerate: (settings: EditorSettings) => void;
}) {
  const [textValues, setTextValues] = useState<TextBoxValue[]>(
    () => initialSettings?.textValues ?? textBoxes.map((b) => ({ id: b.id, text: "" })),
  );
  const [fontFamily, setFontFamily] = useState(initialSettings?.fontFamily ?? "anton");
  const [fontSize, setFontSize] = useState(initialSettings?.fontSize ?? 0); // 0 = auto
  const [textColor, setTextColor] = useState(initialSettings?.textColor ?? "#ffffff");
  const [strokeColor, setStrokeColor] = useState(initialSettings?.strokeColor ?? "#000000");
  const [textAlign, setTextAlign] = useState(initialSettings?.textAlign ?? "center");
  const [allCaps, setAllCaps] = useState(initialSettings?.allCaps ?? true);
  const [generating, setGenerating] = useState(false);

  const updateText = useCallback((id: string, text: string) => {
    setTextValues((prev) => prev.map((v) => (v.id === id ? { ...v, text } : v)));
  }, []);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    onGenerate({ textValues, fontFamily, fontSize, textColor, strokeColor, textAlign, allCaps });
  }, [textValues, fontFamily, fontSize, textColor, strokeColor, textAlign, allCaps, onGenerate]);

  return (
    <div data-testid="meme-editor" className="space-y-4">
      <button
        type="button"
        data-testid="back-to-gallery"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to templates
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Preview */}
        <div
          className="relative rounded-lg overflow-hidden border border-border bg-muted/30"
          style={{ containerType: "inline-size" }}
        >
          <img src={imageSrc} alt="Template preview" className="w-full h-auto block" />
          <TextPreviewOverlay
            boxes={textBoxes}
            textValues={textValues}
            fontFamily={fontFamily}
            fontSize={fontSize}
            textColor={textColor}
            strokeColor={strokeColor}
            textAlign={textAlign}
            allCaps={allCaps}
          />
        </div>

        {/* Settings */}
        <div className="space-y-3">
          {/* Text inputs */}
          {textBoxes.map((box) => {
            const val = textValues.find((v) => v.id === box.id);
            return (
              <div key={box.id}>
                <label
                  htmlFor={`text-${box.id}`}
                  className="text-xs text-muted-foreground capitalize block mb-0.5"
                >
                  {box.defaultText || box.id}
                </label>
                <input
                  id={`text-${box.id}`}
                  data-testid={`text-input-${box.id}`}
                  type="text"
                  value={val?.text ?? ""}
                  onChange={(e) => updateText(box.id, e.target.value)}
                  placeholder={box.defaultText || box.id}
                  className={INPUT_CLASS}
                />
              </div>
            );
          })}

          {/* Font picker */}
          <div>
            <label htmlFor="font-picker" className="text-xs text-muted-foreground block mb-0.5">
              Font
            </label>
            <select
              id="font-picker"
              data-testid="font-picker"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className={INPUT_CLASS}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <label htmlFor="font-size" className="text-xs text-muted-foreground">
                Font Size
              </label>
              <span className="text-xs font-mono text-foreground">
                {fontSize === 0 ? "Auto" : `${fontSize}px`}
              </span>
            </div>
            <input
              id="font-size"
              data-testid="font-size-slider"
              type="range"
              min={0}
              max={200}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Colors */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="text-color" className="text-xs text-muted-foreground block mb-0.5">
                Text Color
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="text-color"
                  data-testid="text-color"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border shrink-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 px-1.5 py-1 rounded border border-border bg-background text-xs text-foreground font-mono"
                />
              </div>
            </div>
            <div className="flex-1">
              <label htmlFor="stroke-color" className="text-xs text-muted-foreground block mb-0.5">
                Stroke Color
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="stroke-color"
                  data-testid="stroke-color"
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border shrink-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="flex-1 px-1.5 py-1 rounded border border-border bg-background text-xs text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          {/* Alignment */}
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Alignment</span>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((align) => {
                const Icon =
                  align === "left" ? AlignLeft : align === "right" ? AlignRight : AlignCenter;
                return (
                  <button
                    key={align}
                    type="button"
                    data-testid={`align-${align}`}
                    onClick={() => setTextAlign(align)}
                    className={cn(
                      "flex-1 py-1.5 rounded flex items-center justify-center transition-colors",
                      textAlign === align
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* All caps */}
          <label
            className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
            data-testid="all-caps"
          >
            <input
              type="checkbox"
              checked={allCaps}
              onChange={(e) => setAllCaps(e.target.checked)}
              className="rounded border-border"
            />
            ALL CAPS
          </label>

          {/* Generate */}
          <button
            type="button"
            data-testid="generate-meme"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Meme
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Result Phase ─────────────────────────────────────────────────────

function MemeResult({
  downloadUrl,
  onEdit,
  onNew,
}: {
  downloadUrl: string;
  onEdit: () => void;
  onNew: () => void;
}) {
  return (
    <div data-testid="meme-result" className="space-y-4">
      <div className="rounded-lg overflow-hidden border border-border bg-muted/30">
        <img
          src={downloadUrl}
          alt="Generated meme"
          className="w-full h-auto block max-h-[70vh] object-contain mx-auto"
        />
      </div>

      <div className="flex gap-2">
        <a
          href={downloadUrl}
          download
          data-testid="download-meme"
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
        <button
          type="button"
          data-testid="edit-meme"
          onClick={onEdit}
          className="px-4 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          data-testid="new-meme"
          onClick={onNew}
          className="px-4 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
        >
          New Meme
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function MemeGeneratorSettings() {
  useFontLoader();

  const [phase, setPhase] = useState<Phase>("gallery");
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected template (template mode)
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);

  // Custom image state
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [customLayout, setCustomLayout] = useState<TextLayout | null>(null);

  // Editor state (preserved across edit/result transitions)
  const [lastEditorSettings, setLastEditorSettings] = useState<EditorSettings | null>(null);

  // Result
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/v1/meme-templates", { headers: formatHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load templates: ${res.status}`);
        return res.json();
      })
      .then((data: TemplateManifest) => {
        if (!cancelled) {
          setTemplates(data.templates);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load templates");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup custom image blob URL
  useEffect(() => {
    return () => {
      if (customImageUrl) URL.revokeObjectURL(customImageUrl);
    };
  }, [customImageUrl]);

  // ── Handlers ──────────────────────────────────────────────────────

  const handleSelectTemplate = useCallback((t: MemeTemplate) => {
    setSelectedTemplate(t);
    setCustomFile(null);
    setCustomImageUrl(null);
    setCustomLayout(null);
    setLastEditorSettings(null);
    setResultUrl(null);
    setPhase("editor");
  }, []);

  const handleUploadCustom = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomFile(file);
    setCustomImageUrl(URL.createObjectURL(file));
    setSelectedTemplate(null);
    setLastEditorSettings(null);
    setResultUrl(null);
    setPhase("layout-picker");
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  }, []);

  const handleLayoutSelect = useCallback((layout: TextLayout) => {
    setCustomLayout(layout);
    setPhase("editor");
  }, []);

  const handleBackToGallery = useCallback(() => {
    setPhase("gallery");
    setSelectedTemplate(null);
    setCustomFile(null);
    if (customImageUrl) {
      URL.revokeObjectURL(customImageUrl);
      setCustomImageUrl(null);
    }
    setCustomLayout(null);
    setLastEditorSettings(null);
    setResultUrl(null);
  }, [customImageUrl]);

  const handleGenerate = useCallback(
    async (settings: {
      textValues: TextBoxValue[];
      fontFamily: string;
      fontSize: number;
      textColor: string;
      strokeColor: string;
      textAlign: string;
      allCaps: boolean;
    }) => {
      setLastEditorSettings(settings);
      setError(null);

      try {
        const apiSettings = {
          templateId: selectedTemplate?.id,
          textLayout: customLayout ?? "top-bottom",
          textBoxes: settings.textValues,
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize > 0 ? settings.fontSize : undefined,
          textColor: settings.textColor,
          strokeColor: settings.strokeColor,
          textAlign: settings.textAlign,
          allCaps: settings.allCaps,
        };

        let response: Response;

        if (customFile) {
          // Custom image mode: multipart
          const formData = new FormData();
          formData.append("file", customFile);
          formData.append("settings", JSON.stringify(apiSettings));

          response = await fetch("/api/v1/tools/meme-generator", {
            method: "POST",
            headers: formatHeaders(),
            body: formData,
          });
        } else {
          // Template mode: JSON
          response = await fetch("/api/v1/tools/meme-generator", {
            method: "POST",
            headers: formatHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(apiSettings),
          });
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as Record<string, string>).error || `Generation failed: ${response.status}`,
          );
        }

        const result = (await response.json()) as {
          jobId: string;
          downloadUrl: string;
          originalSize: number;
          processedSize: number;
        };

        setResultUrl(result.downloadUrl);
        setPhase("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Meme generation failed");
        // Stay on editor phase so user can retry
      }
    },
    [selectedTemplate, customFile, customLayout],
  );

  const handleEditFromResult = useCallback(() => {
    setPhase("editor");
  }, []);

  const handleNewMeme = useCallback(() => {
    handleBackToGallery();
  }, [handleBackToGallery]);

  // ── Derived state for editor ──────────────────────────────────────

  const editorImageSrc = selectedTemplate
    ? `/api/v1/meme-templates/full/${selectedTemplate.filename}`
    : (customImageUrl ?? "");

  const editorTextBoxes = selectedTemplate
    ? selectedTemplate.textBoxes
    : ((customLayout && PRESET_LAYOUTS[customLayout]?.boxes) ?? PRESET_LAYOUTS["top-bottom"].boxes);

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading templates...</span>
      </div>
    );
  }

  if (error && phase === "gallery") {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.hif"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && phase !== "gallery" && (
        <div className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {phase === "gallery" && (
        <TemplateGallery
          templates={templates}
          onSelect={handleSelectTemplate}
          onUploadCustom={handleUploadCustom}
        />
      )}

      {phase === "layout-picker" && customImageUrl && (
        <LayoutPicker
          customImageUrl={customImageUrl}
          onSelect={handleLayoutSelect}
          onBack={handleBackToGallery}
        />
      )}

      {phase === "editor" && (
        <MemeEditor
          key={selectedTemplate?.id ?? customLayout ?? "editor"}
          imageSrc={editorImageSrc}
          textBoxes={editorTextBoxes}
          initialSettings={lastEditorSettings}
          onBack={handleBackToGallery}
          onGenerate={handleGenerate}
        />
      )}

      {phase === "result" && resultUrl && (
        <MemeResult downloadUrl={resultUrl} onEdit={handleEditFromResult} onNew={handleNewMeme} />
      )}
    </div>
  );
}
